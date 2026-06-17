"""Evaluation serializers."""

from rest_framework import serializers
from .models import EvaluationCase, EvaluationRun


class EvaluationCaseSerializer(serializers.ModelSerializer):
    """Full evaluation case serializer with benchmark metadata."""

    class Meta:
        model = EvaluationCase
        fields = [
            'id', 'project', 'question', 'expected_answer_traits',
            'expected_source_files', 'notes',
            # Benchmark versioning
            'benchmark_suite', 'benchmark_version', 'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EvaluationRunSerializer(serializers.ModelSerializer):
    """Full run serializer with config snapshot, split metrics, and comparison."""
    question = serializers.CharField(source='evaluation_case.question', read_only=True)

    class Meta:
        model = EvaluationRun
        fields = [
            'id', 'evaluation_case', 'question', 'generated_answer',
            'retrieved_chunks', 'expected_files_retrieved',
            'retrieval_precision', 'groundedness_rating', 'usefulness_rating',
            'reviewer_notes', 'status', 'duration_seconds',
            # Config snapshot
            'run_config',
            # Split metrics
            'retrieval_recall', 'retrieval_latency_ms',
            'generation_latency_ms', 'context_tokens_used',
            # Comparison
            'compared_to_run',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class EvaluationRunCompactSerializer(serializers.ModelSerializer):
    """Lighter serializer for comparison views (no full answer text)."""
    question = serializers.CharField(source='evaluation_case.question', read_only=True)

    class Meta:
        model = EvaluationRun
        fields = [
            'id', 'evaluation_case', 'question',
            'retrieval_precision', 'retrieval_recall',
            'retrieval_latency_ms', 'generation_latency_ms',
            'context_tokens_used',
            'run_config', 'status', 'duration_seconds',
            'created_at',
        ]


class EvaluationBatchRunSerializer(serializers.Serializer):
    """Input for running evaluation across all cases."""
    top_k = serializers.IntegerField(required=False, default=10, min_value=1, max_value=50)
