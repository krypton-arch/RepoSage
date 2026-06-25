"""Project serializers."""

from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    """Full project serializer with computed stats."""

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'source_type', 'source_path',
            'status', 'total_files', 'total_chunks', 'last_indexed_at',
            # Retrieval settings
            'retrieval_mode', 'retrieval_top_k', 'max_context_tokens',
            # Access control
            'owner_id', 'visibility',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'total_files', 'total_chunks',
            'last_indexed_at', 'created_at', 'updated_at',
        ]


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a project."""

    class Meta:
        model = Project
        fields = [
            'name', 'description', 'source_type', 'source_path',
            # Allow setting retrieval config at creation
            'retrieval_mode', 'retrieval_top_k', 'max_context_tokens',
            'visibility',
        ]


class ProjectSettingsSerializer(serializers.ModelSerializer):
    """Serializer for PATCH-updating project retrieval/ACL settings."""

    class Meta:
        model = Project
        fields = [
            'retrieval_mode', 'retrieval_top_k', 'max_context_tokens',
            'visibility',
        ]

    def validate_retrieval_top_k(self, value):
        if value < 1 or value > 50:
            raise serializers.ValidationError('retrieval_top_k must be between 1 and 50.')
        return value

    def validate_max_context_tokens(self, value):
        if value < 500 or value > 16000:
            raise serializers.ValidationError('max_context_tokens must be between 500 and 16000.')
        return value


class ProjectStatsSerializer(serializers.Serializer):
    """Detailed project statistics."""

    total_files = serializers.IntegerField()
    total_chunks = serializers.IntegerField()
    chunks_by_type = serializers.DictField()
    chunks_by_language = serializers.DictField()
    total_queries = serializers.IntegerField()
    total_eval_cases = serializers.IntegerField()
    last_ingestion_job = serializers.DictField(allow_null=True)
    avg_chunk_tokens = serializers.FloatField()


from .models import GlobalSettings

class GlobalSettingsSerializer(serializers.ModelSerializer):
    """Serializer for global system settings."""
    class Meta:
        model = GlobalSettings
        fields = [
            'theme',
            'telemetry_enabled',
            'ollama_endpoint',
            'max_concurrent_jobs',
            'vector_retention_days'
        ]
