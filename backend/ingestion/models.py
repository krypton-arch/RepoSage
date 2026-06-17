"""Ingestion models — documents, chunks, jobs, and embedding cache."""

import uuid
from django.db import models
from pgvector.django import VectorField


class SourceDocument(models.Model):
    """A single file that has been ingested into a project."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        INDEXED = 'indexed', 'Indexed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='documents',
    )
    file_path = models.CharField(max_length=1024)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    language = models.CharField(max_length=50, blank=True, default='')
    file_size_bytes = models.IntegerField(default=0)
    content_hash = models.CharField(max_length=64, blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # --- Pipeline versioning ---
    parser_version = models.CharField(max_length=20, default='1.0')
    chunker_version = models.CharField(max_length=20, default='1.0')
    embedding_model = models.CharField(
        max_length=100, blank=True, default='',
        help_text='Name of the embedding model used during indexing.',
    )
    embedding_version = models.CharField(max_length=20, blank=True, default='')
    index_version = models.CharField(
        max_length=20, default='1.0',
        help_text='Composite version identifier for the full pipeline run.',
    )
    indexed_at = models.DateTimeField(null=True, blank=True)

    # --- Access control prep ---
    visibility = models.CharField(
        max_length=20,
        choices=[
            ('inherit', 'Inherit from Project'),
            ('visible', 'Visible'),
            ('hidden', 'Hidden'),
        ],
        default='inherit',
    )

    class Meta:
        ordering = ['file_path']
        unique_together = ['project', 'file_path']

    def __str__(self):
        return f"{self.project.name}/{self.file_path}"


class DocumentChunk(models.Model):
    """A chunk of content extracted from a source document, with its embedding vector."""

    class ChunkType(models.TextChoices):
        CODE = 'code', 'Code'
        MARKDOWN = 'markdown', 'Markdown'
        TEXT = 'text', 'Plain Text'
        CONFIG = 'config', 'Configuration'
        DOCSTRING = 'docstring', 'Docstring'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        SourceDocument,
        on_delete=models.CASCADE,
        related_name='chunks',
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='chunks',
    )
    chunk_index = models.IntegerField()
    content = models.TextField()
    heading_context = models.CharField(max_length=512, blank=True, default='')
    symbol_context = models.CharField(max_length=512, blank=True, default='')
    chunk_type = models.CharField(
        max_length=20,
        choices=ChunkType.choices,
        default=ChunkType.TEXT,
    )
    start_line = models.IntegerField(null=True, blank=True)
    end_line = models.IntegerField(null=True, blank=True)
    token_count = models.IntegerField(default=0)
    char_count = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    embedding = VectorField(dimensions=384, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # --- Version linkage ---
    embedding_model = models.CharField(
        max_length=100, blank=True, default='',
        help_text='Embedding model used to generate the vector for this chunk.',
    )
    embedding_version = models.CharField(max_length=20, blank=True, default='')
    is_stale = models.BooleanField(
        default=False,
        help_text='True when pipeline versions change and this chunk has not been re-embedded.',
    )

    # --- Embedding cache key ---
    content_hash = models.CharField(
        max_length=64, blank=True, default='',
        help_text='SHA-256 of content. Used for embedding deduplication.',
    )

    class Meta:
        ordering = ['document', 'chunk_index']
        indexes = [
            models.Index(fields=['project', 'chunk_type']),
            models.Index(fields=['project', 'is_stale']),
            models.Index(fields=['content_hash']),
        ]

    def __str__(self):
        return f"{self.document.file_path}[{self.chunk_index}]"


class IngestionJob(models.Model):
    """Tracks a single ingestion run for a project."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        QUEUED = 'queued', 'Queued'
        RUNNING = 'running', 'Running'
        PARTIAL_SUCCESS = 'partial_success', 'Partial Success'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='ingestion_jobs',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    total_files = models.IntegerField(default=0)
    processed_files = models.IntegerField(default=0)
    failed_files = models.IntegerField(default=0)
    total_chunks_created = models.IntegerField(default=0)
    error_log = models.TextField(blank=True, default='')
    duration_seconds = models.FloatField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # --- Trace + pipeline config snapshot ---
    trace_id = models.UUIDField(
        default=uuid.uuid4, editable=False,
        help_text='Unique trace identifier for end-to-end observability.',
    )
    embedding_model = models.CharField(max_length=100, blank=True, default='')
    parser_version = models.CharField(max_length=20, default='1.0')
    chunker_version = models.CharField(max_length=20, default='1.0')
    embedding_version = models.CharField(max_length=20, default='1.0')

    # --- Stage timings (observability) ---
    stage_timings = models.JSONField(
        default=dict, blank=True,
        help_text='Wall-clock time per stage: {"discover": 0.1, "parse": 2.3, ...}',
    )

    # --- Checkpoint/resume ---
    completed_file_ids = models.JSONField(
        default=list, blank=True,
        help_text='UUIDs of SourceDocuments that completed successfully (for resume).',
    )

    # --- Structured error log ---
    error_details = models.JSONField(
        default=list, blank=True,
        help_text='Structured errors: [{"file": "...", "stage": "parse", "error": "...", "category": "parse_error"}]',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Job {self.id} ({self.status}) for {self.project.name}"


class EmbeddingCache(models.Model):
    """Cache for embedding vectors keyed by content hash + model.

    Prevents recomputing embeddings for identical text across chunks,
    documents, or re-indexing runs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_hash = models.CharField(
        max_length=64, db_index=True,
        help_text='SHA-256 of the text content.',
    )
    embedding_model = models.CharField(max_length=100)
    dimension = models.IntegerField(
        default=384,
        help_text='Dimension of the stored embedding vector.',
    )
    embedding = VectorField(dimensions=384, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['content_hash', 'embedding_model']
        indexes = [
            models.Index(fields=['content_hash', 'embedding_model']),
        ]

    def __str__(self):
        return f"Cache({self.content_hash[:12]}... @ {self.embedding_model})"
