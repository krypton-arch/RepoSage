"""Pipeline version constants and staleness detection.

Bump these constants when parser, chunker, or embedding logic changes.
The system uses these to detect stale indexed content and prevent
mixed-version retrieval.
"""

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ingestion.models import SourceDocument

logger = logging.getLogger(__name__)

# --- Pipeline version constants ---
# Increment these when the corresponding logic changes materially.
PARSER_VERSION = '1.0'
CHUNKER_VERSION = '1.0'
EMBEDDING_VERSION = '1.0'


def get_current_versions() -> dict:
    """Returns the current pipeline versions from constants + settings."""
    from django.conf import settings
    return {
        'parser_version': PARSER_VERSION,
        'chunker_version': CHUNKER_VERSION,
        'embedding_version': EMBEDDING_VERSION,
        'embedding_model': getattr(settings, 'EMBEDDING_MODEL', 'all-MiniLM-L6-v2'),
    }


def is_document_stale(doc: 'SourceDocument') -> bool:
    """Check if a document's indexed content is stale relative to current config."""
    versions = get_current_versions()
    return (
        doc.parser_version != versions['parser_version']
        or doc.chunker_version != versions['chunker_version']
        or doc.embedding_model != versions['embedding_model']
        or doc.embedding_version != versions['embedding_version']
    )


def get_stale_document_ids(project_id: str) -> list[str]:
    """Return IDs of documents whose versions don't match current config."""
    from ingestion.models import SourceDocument
    versions = get_current_versions()

    stale_docs = SourceDocument.objects.filter(
        project_id=project_id,
    ).exclude(
        parser_version=versions['parser_version'],
        chunker_version=versions['chunker_version'],
        embedding_model=versions['embedding_model'],
        embedding_version=versions['embedding_version'],
    ).values_list('id', flat=True)

    return [str(uid) for uid in stale_docs]


def mark_stale_chunks(project_id: str) -> int:
    """Mark all chunks as stale where embedding version doesn't match current config.

    Returns the number of chunks marked stale.
    """
    from ingestion.models import DocumentChunk
    versions = get_current_versions()

    count = DocumentChunk.objects.filter(
        project_id=project_id,
        is_stale=False,
    ).exclude(
        embedding_model=versions['embedding_model'],
        embedding_version=versions['embedding_version'],
    ).update(is_stale=True)

    if count:
        logger.info(
            f"Marked {count} chunks as stale in project {project_id} "
            f"(current: {versions['embedding_model']}@{versions['embedding_version']})"
        )
    return count


def get_staleness_report(project_id: str) -> dict:
    """Generate a staleness report for a project."""
    from ingestion.models import DocumentChunk, SourceDocument
    from django.db.models import Count

    versions = get_current_versions()

    total_chunks = DocumentChunk.objects.filter(project_id=project_id).count()
    stale_chunks = DocumentChunk.objects.filter(
        project_id=project_id, is_stale=True,
    ).count()

    stale_documents = SourceDocument.objects.filter(
        project_id=project_id,
    ).exclude(
        parser_version=versions['parser_version'],
        chunker_version=versions['chunker_version'],
        embedding_model=versions['embedding_model'],
        embedding_version=versions['embedding_version'],
    ).count()

    # Group stale chunks by their embedding model
    stale_by_model = (
        DocumentChunk.objects.filter(project_id=project_id, is_stale=True)
        .values('embedding_model')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return {
        'total_chunks': total_chunks,
        'stale_chunks': stale_chunks,
        'stale_documents': stale_documents,
        'current_versions': versions,
        'stale_versions': [
            {'embedding_model': entry['embedding_model'] or 'unknown', 'count': entry['count']}
            for entry in stale_by_model
        ],
    }
