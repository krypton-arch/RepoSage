"""Ingestion admin configuration."""

from django.contrib import admin
from .models import SourceDocument, DocumentChunk, IngestionJob, EmbeddingCache


@admin.register(SourceDocument)
class SourceDocumentAdmin(admin.ModelAdmin):
    list_display = [
        'file_path', 'project', 'file_type', 'language', 'status',
        'parser_version', 'embedding_model', 'file_size_bytes', 'indexed_at', 'created_at',
    ]
    list_filter = ['status', 'file_type', 'language', 'parser_version', 'embedding_model', 'visibility']
    search_fields = ['file_path', 'file_name']
    readonly_fields = ['content_hash']


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = [
        'document', 'chunk_index', 'chunk_type', 'token_count',
        'is_stale', 'embedding_model', 'symbol_context', 'created_at',
    ]
    list_filter = ['chunk_type', 'is_stale', 'embedding_model']
    search_fields = ['content', 'symbol_context', 'heading_context']


@admin.register(IngestionJob)
class IngestionJobAdmin(admin.ModelAdmin):
    list_display = [
        'project', 'status', 'total_files', 'processed_files', 'failed_files',
        'total_chunks_created', 'embedding_model', 'duration_seconds', 'created_at',
    ]
    list_filter = ['status', 'embedding_model', 'parser_version']
    readonly_fields = ['trace_id', 'stage_timings', 'completed_file_ids', 'error_details']


@admin.register(EmbeddingCache)
class EmbeddingCacheAdmin(admin.ModelAdmin):
    list_display = ['content_hash', 'embedding_model', 'dimension', 'created_at']
    list_filter = ['embedding_model']
    search_fields = ['content_hash']
    readonly_fields = ['content_hash', 'embedding_model']
