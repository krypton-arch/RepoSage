"""Lexical search — PostgreSQL full-text search with SearchVector/SearchRank.

Provides keyword-based retrieval as an alternative or complement to vector
similarity search.  Uses Django's ``django.contrib.postgres.search`` module
so no external search engine (Elasticsearch, etc.) is required.
"""

import logging
import time

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector

from common.acl import get_visible_chunks_queryset

logger = logging.getLogger(__name__)


def search_lexical(
    project_id: str,
    query: str,
    top_k: int = 10,
    chunk_type: str | None = None,
    file_path_pattern: str | None = None,
    **filters,
) -> tuple[list[dict], float]:
    """Full-text search using PostgreSQL's built-in tsvector ranking.

    Builds a ``SearchVector`` across ``content``, ``symbol_context``, and
    ``heading_context`` columns, then ranks results with ``SearchRank``.

    Args:
        project_id: UUID of the project to search within.
        query: Natural-language or keyword query string.
        top_k: Maximum number of results to return.
        chunk_type: Optional filter for chunk type (code, markdown, etc.).
        file_path_pattern: Optional substring match on document file path.
        **filters: Reserved for future filter extensions.

    Returns:
        A tuple of ``(results, retrieval_time_ms)`` where *results* is a list
        of dicts matching the shape produced by
        :func:`retrieval.services.searcher.search_similar_chunks`.
    """
    start_time = time.time()

    # Build the search vector across three content fields.
    # Weights: content (A – highest), symbol_context (B), heading_context (C).
    search_vector = (
        SearchVector('content', weight='A')
        + SearchVector('symbol_context', weight='B')
        + SearchVector('heading_context', weight='C')
    )

    search_query = SearchQuery(query, search_type='websearch')

    # Start from the ACL-filtered queryset (already excludes is_stale=True).
    queryset = (
        get_visible_chunks_queryset(project_id)
        .filter(embedding__isnull=False)
    )

    # Optional metadata filters
    if chunk_type:
        queryset = queryset.filter(chunk_type=chunk_type)

    if file_path_pattern:
        queryset = queryset.filter(document__file_path__icontains=file_path_pattern)

    # Annotate with search rank and filter to matching documents only.
    queryset = (
        queryset
        .annotate(
            search=search_vector,
            rank=SearchRank(search_vector, search_query),
        )
        .filter(search=search_query)
        .order_by('-rank')[:top_k]
    )

    # Convert to result dicts — same shape as vector search results.
    results: list[dict] = []
    for chunk in queryset:
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
            'similarity_score': round(float(chunk.rank), 4),
            'metadata': chunk.metadata,
            'retrieval_method': 'lexical',
        })

    retrieval_time_ms = (time.time() - start_time) * 1000

    logger.info(
        "Lexical search returned %d chunks for query '%s...' in %.1fms",
        len(results),
        query[:50],
        retrieval_time_ms,
    )

    return results, retrieval_time_ms
