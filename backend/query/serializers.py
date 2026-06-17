"""Query serializers."""

from rest_framework import serializers
from .models import QuerySession, RetrievedChunkLog


class RetrievedChunkLogSerializer(serializers.ModelSerializer):
    file_path = serializers.CharField(source='chunk.document.file_path', read_only=True)
    content = serializers.CharField(source='chunk.content', read_only=True)
    chunk_type = serializers.CharField(source='chunk.chunk_type', read_only=True)
    heading_context = serializers.CharField(source='chunk.heading_context', read_only=True)
    symbol_context = serializers.CharField(source='chunk.symbol_context', read_only=True)

    class Meta:
        model = RetrievedChunkLog
        fields = [
            'id', 'chunk', 'rank', 'similarity_score', 'used_in_answer',
            'file_path', 'content', 'chunk_type', 'heading_context', 'symbol_context',
            'created_at',
        ]


class QuerySessionSerializer(serializers.ModelSerializer):
    """Full session serializer with retrieved chunks, trace, config, and metrics."""
    retrieved_chunks = RetrievedChunkLogSerializer(many=True, read_only=True)

    class Meta:
        model = QuerySession
        fields = [
            'id', 'project', 'question', 'answer', 'confidence_level',
            'retrieval_time_ms', 'generation_time_ms',
            'chunks_retrieved', 'chunks_used',
            'retrieved_chunks', 'metadata', 'created_at',
            # Trace
            'trace_id',
            # Retrieval config
            'retrieval_mode', 'top_k_requested',
            # Generation metadata
            'generation_model', 'embedding_model',
            'prompt_token_estimate', 'context_token_estimate',
            # Retrieval quality metrics
            'avg_similarity_score', 'max_similarity_score',
            'min_similarity_score', 'score_std_dev',
        ]
        read_only_fields = ['id', 'trace_id', 'created_at']


class QuerySessionListSerializer(serializers.ModelSerializer):
    """Lighter serializer for listing queries (without full chunk data)."""

    class Meta:
        model = QuerySession
        fields = [
            'id', 'project', 'question', 'confidence_level',
            'retrieval_time_ms', 'generation_time_ms',
            'chunks_retrieved', 'chunks_used',
            # Key metadata for list view
            'retrieval_mode', 'generation_model',
            'avg_similarity_score',
            'created_at',
        ]


class QueryInputSerializer(serializers.Serializer):
    """Input serializer for asking a question."""
    question = serializers.CharField(max_length=2000)
    top_k = serializers.IntegerField(required=False, default=10, min_value=1, max_value=50)
