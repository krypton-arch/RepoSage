"""Query models — sessions and retrieval logs."""

import uuid
from django.db import models


class QuerySession(models.Model):
    """A single question-answer interaction within a project."""

    class ConfidenceLevel(models.TextChoices):
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'
        INSUFFICIENT = 'insufficient', 'Insufficient Evidence'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='query_sessions',
    )
    question = models.TextField()
    answer = models.TextField(blank=True, default='')
    raw_context = models.TextField(blank=True, default='')
    generation_time_ms = models.FloatField(null=True, blank=True)
    retrieval_time_ms = models.FloatField(null=True, blank=True)
    chunks_retrieved = models.IntegerField(default=0)
    chunks_used = models.IntegerField(default=0)
    confidence_level = models.CharField(
        max_length=20,
        choices=ConfidenceLevel.choices,
        default=ConfidenceLevel.MEDIUM,
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # --- Trace (observability) ---
    trace_id = models.UUIDField(
        default=uuid.uuid4, editable=False,
        help_text='Unique trace identifier for end-to-end query observability.',
    )

    # --- Retrieval config used ---
    retrieval_mode = models.CharField(
        max_length=20, default='vector',
        help_text='Retrieval strategy used: vector, hybrid, or lexical.',
    )
    top_k_requested = models.IntegerField(default=10)

    # --- Generation metadata ---
    generation_model = models.CharField(
        max_length=100, blank=True, default='',
        help_text='LLM model name used for answer generation.',
    )
    embedding_model = models.CharField(
        max_length=100, blank=True, default='',
        help_text='Embedding model used for query vector.',
    )
    prompt_token_estimate = models.IntegerField(
        default=0,
        help_text='Estimated token count of the full prompt sent to the LLM.',
    )
    context_token_estimate = models.IntegerField(
        default=0,
        help_text='Estimated token count of the assembled context.',
    )

    # --- Retrieval quality metrics ---
    avg_similarity_score = models.FloatField(null=True, blank=True)
    max_similarity_score = models.FloatField(null=True, blank=True)
    min_similarity_score = models.FloatField(null=True, blank=True)
    score_std_dev = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Q: {self.question[:80]}..."


class RetrievedChunkLog(models.Model):
    """Log of a single chunk retrieved during a query, for the inspector."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    query_session = models.ForeignKey(
        QuerySession,
        on_delete=models.CASCADE,
        related_name='retrieved_chunks',
    )
    chunk = models.ForeignKey(
        'ingestion.DocumentChunk',
        on_delete=models.CASCADE,
        related_name='retrieval_logs',
    )
    rank = models.IntegerField()
    similarity_score = models.FloatField()
    used_in_answer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['rank']

    def __str__(self):
        return f"Rank {self.rank}: {self.chunk} (score={self.similarity_score:.3f})"
