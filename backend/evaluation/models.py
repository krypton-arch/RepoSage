"""Evaluation models — test cases and evaluation runs."""

import uuid
from django.db import models


class EvaluationCase(models.Model):
    """A test case for evaluating retrieval and answer quality."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='evaluation_cases',
    )
    question = models.TextField()
    expected_answer_traits = models.TextField(
        blank=True,
        default='',
        help_text='Keywords or concepts expected in the answer',
    )
    expected_source_files = models.JSONField(
        default=list,
        blank=True,
        help_text='List of file paths that should appear in retrieved chunks',
    )
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --- Benchmark versioning ---
    benchmark_suite = models.CharField(
        max_length=100, default='default',
        help_text='Name of the benchmark suite this case belongs to.',
    )
    benchmark_version = models.CharField(
        max_length=20, default='1.0',
        help_text='Version of the benchmark suite for reproducibility.',
    )
    tags = models.JSONField(
        default=list, blank=True,
        help_text='Classification tags: ["retrieval", "code-nav", "architecture", "regression"]',
    )

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Eval: {self.question[:80]}..."


class EvaluationRun(models.Model):
    """Result of running an evaluation case through the pipeline."""

    class GroundednessRating(models.TextChoices):
        GROUNDED = 'grounded', 'Grounded'
        PARTIALLY = 'partially_grounded', 'Partially Grounded'
        UNGROUNDED = 'ungrounded', 'Ungrounded'
        UNRATED = 'unrated', 'Not Yet Rated'

    class UsefulnessRating(models.TextChoices):
        USEFUL = 'useful', 'Useful'
        PARTIALLY = 'partially_useful', 'Partially Useful'
        NOT_USEFUL = 'not_useful', 'Not Useful'
        UNRATED = 'unrated', 'Not Yet Rated'

    class Status(models.TextChoices):
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evaluation_case = models.ForeignKey(
        EvaluationCase,
        on_delete=models.CASCADE,
        related_name='runs',
    )
    generated_answer = models.TextField(blank=True, default='')
    retrieved_chunks = models.JSONField(default=list, blank=True)
    expected_files_retrieved = models.BooleanField(null=True, blank=True)
    retrieval_precision = models.FloatField(null=True, blank=True)
    groundedness_rating = models.CharField(
        max_length=30,
        choices=GroundednessRating.choices,
        default=GroundednessRating.UNRATED,
    )
    usefulness_rating = models.CharField(
        max_length=30,
        choices=UsefulnessRating.choices,
        default=UsefulnessRating.UNRATED,
    )
    reviewer_notes = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.RUNNING,
    )
    duration_seconds = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # --- Config snapshot for comparison ---
    run_config = models.JSONField(
        default=dict, blank=True,
        help_text='Pipeline config at time of run: embedding_model, retrieval_mode, top_k, etc.',
    )

    # --- Split metrics ---
    retrieval_recall = models.FloatField(
        null=True, blank=True,
        help_text='Fraction of expected source files that appeared in retrieved chunks.',
    )
    retrieval_latency_ms = models.FloatField(null=True, blank=True)
    generation_latency_ms = models.FloatField(null=True, blank=True)
    context_tokens_used = models.IntegerField(null=True, blank=True)

    # --- Comparison linkage ---
    compared_to_run = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='comparison_runs',
        help_text='Link to a previous run for delta comparison.',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Run {self.id} for {self.evaluation_case}"
