"""Semantic searcher — pgvector similarity search with ACL and staleness filtering."""

import logging
import time
from django.conf import settings
from pgvector.django import CosineDistance

from common.acl import get_visible_chunks_queryset
from embeddings.services import embed_query

logger = logging.getLogger(__name__)


def search_similar_chunks(
    project_id: str,
    query: str,
    top_k: int | None = None,
    chunk_type: str | None = None,
    file_path_pattern: str | None = None,
    similarity_threshold: float | None = None,
) -> tuple[list[dict], float]:
    """Search for similar chunks using pgvector cosine similarity.

    Uses the ACL-filtered queryset which automatically excludes stale chunks
    and enforces project scope.

    Returns:
        (results, retrieval_time_ms) where results is a list of dicts with
        chunk data and similarity scores.
    """
    if top_k is None:
        top_k = getattr(settings, 'RETRIEVAL_TOP_K', 10)
    if similarity_threshold is None:
        similarity_threshold = getattr(settings, 'RETRIEVAL_SIMILARITY_THRESHOLD', 0.3)

    start_time = time.time()

    # Embed the query
    query_embedding = embed_query(query)

    # Build queryset from ACL layer (already filters is_stale=False + project scope)
    queryset = get_visible_chunks_queryset(project_id).filter(
        embedding__isnull=False,
    )

    if chunk_type:
        queryset = queryset.filter(chunk_type=chunk_type)

    if file_path_pattern:
        queryset = queryset.filter(document__file_path__icontains=file_path_pattern)

    # Annotate with cosine distance and order by similarity
    queryset = queryset.annotate(
        distance=CosineDistance('embedding', query_embedding)
    ).order_by('distance')[:top_k]

    # Convert to result dicts
    results = []
    for chunk in queryset:
        similarity_score = 1 - chunk.distance  # Convert distance to similarity
        if similarity_score < similarity_threshold:
            continue

        results.append({
            'chunk_id': str(chunk.id),
            'content': chunk.content,
            'file_path': chunk.document.file_path,
            'file_name': chunk.document.file_name,
            'chunk_index': chunk.chunk_index,
            'chunk_type': chunk.chunk_type,
            'heading_context': chunk.heading_context,
            'symbol_context': chunk.symbol_context,
            'start_line': chunk.start_line,
            'end_line': chunk.end_line,
            'token_count': chunk.token_count,
            'similarity_score': round(similarity_score, 4),
            'metadata': chunk.metadata,
            'retrieval_method': 'vector',
        })

    retrieval_time_ms = (time.time() - start_time) * 1000

    logger.info(
        f"Retrieved {len(results)} chunks for query '{query[:50]}...' "
        f"in {retrieval_time_ms:.1f}ms"
    )

    return results, retrieval_time_ms
