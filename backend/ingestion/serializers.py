"""Ingestion serializers — REST representations for documents, chunks, and jobs."""

from rest_framework import serializers

from .models import DocumentChunk, IngestionJob, SourceDocument


class SourceDocumentSerializer(serializers.ModelSerializer):
    """Serializer for :class:`SourceDocument`.

    Includes pipeline-version stamps, access-control visibility, and a
    computed ``chunk_count`` for convenience.
    """

    chunk_count = serializers.SerializerMethodField()

    class Meta:
        model = SourceDocument
        fields = [
            "id",
            "project",
            "file_path",
            "file_name",
            "file_type",
            "language",
            "file_size_bytes",
            "content_hash",
            "status",
            "chunk_count",
            "created_at",
            # Phase B additions
            "parser_version",
            "chunker_version",
            "embedding_model",
            "embedding_version",
            "indexed_at",
            "visibility",
        ]
        read_only_fields = [
            "id",
            "content_hash",
            "status",
            "created_at",
            "parser_version",
            "chunker_version",
            "embedding_model",
            "embedding_version",
            "indexed_at",
        ]

    def get_chunk_count(self, obj: SourceDocument) -> int:
        """Return the number of chunks for this document."""
        return obj.chunks.count()


class DocumentChunkSerializer(serializers.ModelSerializer):
    """Serializer for :class:`DocumentChunk`.

    Exposes embedding-model metadata, staleness flag, and content hash
    alongside the standard chunk fields.
    """

    file_path = serializers.CharField(source="document.file_path", read_only=True)

    class Meta:
        model = DocumentChunk
        fields = [
            "id",
            "document",
            "chunk_index",
            "content",
            "heading_context",
            "symbol_context",
            "chunk_type",
            "start_line",
            "end_line",
            "token_count",
            "char_count",
            "metadata",
            "file_path",
            "created_at",
            # Phase B additions
            "embedding_model",
            "is_stale",
            "content_hash",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "embedding_model",
            "is_stale",
            "content_hash",
        ]


class IngestionJobSerializer(serializers.ModelSerializer):
    """Serializer for :class:`IngestionJob`.

    Includes trace / observability fields, pipeline-version snapshot,
    stage timings, checkpoint progress, and structured error details.
    """

    class Meta:
        model = IngestionJob
        fields = [
            "id",
            "project",
            "status",
            "total_files",
            "processed_files",
            "failed_files",
            "total_chunks_created",
            "error_log",
            "duration_seconds",
            "started_at",
            "completed_at",
            "created_at",
            # Phase B additions
            "trace_id",
            "embedding_model",
            "parser_version",
            "chunker_version",
            "embedding_version",
            "stage_timings",
            "completed_file_ids",
            "error_details",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "trace_id",
            "embedding_model",
            "parser_version",
            "chunker_version",
            "embedding_version",
            "stage_timings",
            "completed_file_ids",
            "error_details",
        ]


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file upload requests."""

    files = serializers.ListField(
        child=serializers.FileField(),
        allow_empty=False,
        help_text="One or more files to upload",
    )


class ZipUploadSerializer(serializers.Serializer):
    """Serializer for zip archive upload."""

    file = serializers.FileField(help_text="A zip archive containing source files")
