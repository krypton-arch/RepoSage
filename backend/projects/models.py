"""Project model — represents a codebase or documentation set."""

import uuid
from django.db import models


class Project(models.Model):
    """A workspace representing one codebase or technical knowledge source."""

    class SourceType(models.TextChoices):
        UPLOAD = 'upload', 'File Upload'
        LOCAL = 'local', 'Local Directory'
        GITHUB = 'github', 'GitHub Repository'

    class Status(models.TextChoices):
        CREATED = 'created', 'Created'
        INGESTING = 'ingesting', 'Ingesting'
        INDEXED = 'indexed', 'Indexed'
        FAILED = 'failed', 'Failed'

    class RetrievalMode(models.TextChoices):
        VECTOR = 'vector', 'Vector (Semantic)'
        HYBRID = 'hybrid', 'Hybrid (Semantic + Lexical)'
        LEXICAL = 'lexical', 'Lexical (Full-Text)'

    class Visibility(models.TextChoices):
        PRIVATE = 'private', 'Private'
        SHARED = 'shared', 'Shared'
        PUBLIC = 'public', 'Public'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    source_type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.UPLOAD,
    )
    source_path = models.CharField(max_length=1024, blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED,
    )
    total_files = models.IntegerField(default=0)
    total_chunks = models.IntegerField(default=0)
    last_indexed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --- Retrieval settings (per-project tuning) ---
    retrieval_mode = models.CharField(
        max_length=20,
        choices=RetrievalMode.choices,
        default=RetrievalMode.VECTOR,
    )
    retrieval_top_k = models.IntegerField(default=10)
    max_context_tokens = models.IntegerField(default=3000)

    # --- Access control prep ---
    owner_id = models.CharField(
        max_length=255,
        blank=True,
        default='system',
        help_text='Owner identifier — plain string, decoupled from auth model.',
    )
    visibility = models.CharField(
        max_length=20,
        choices=Visibility.choices,
        default=Visibility.PRIVATE,
    )

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name
