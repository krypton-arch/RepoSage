"""Retrieval strategy abstraction — pluggable search backends.

Implements the **Strategy pattern** so callers can request ``vector``,
``lexical``, or ``hybrid`` retrieval without knowing the implementation
details.  The hybrid strategy uses **Reciprocal Rank Fusion (RRF)** to
merge results from both vector and lexical pipelines.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class RetrievalStrategy(ABC):
    """Interface that all retrieval strategies must implement."""

    @abstractmethod
    def search(
        self,
        project_id: str,
        query: str,
        top_k: int = 10,
        **filters,
    ) -> tuple[list[dict], float]:
        """Execute a search and return ``(results, retrieval_time_ms)``.

        Each result dict must follow the canonical shape defined in
        :func:`retrieval.services.searcher.search_similar_chunks`.
        """


# ---------------------------------------------------------------------------
# Concrete strategies
# ---------------------------------------------------------------------------

class VectorStrategy(RetrievalStrategy):
    """Semantic search via pgvector cosine similarity."""

    def search(
        self,
        project_id: str,
        query: str,
        top_k: int = 10,
        **filters,
    ) -> tuple[list[dict], float]:
        from retrieval.services.searcher import search_similar_chunks

        return search_similar_chunks(
            project_id=project_id,
            query=query,
            top_k=top_k,
            chunk_type=filters.get('chunk_type'),
            file_path_pattern=filters.get('file_path_pattern'),
            similarity_threshold=filters.get('similarity_threshold'),
        )


class LexicalStrategy(RetrievalStrategy):
    """PostgreSQL full-text search using ``SearchVector`` / ``SearchRank``."""

    def search(
        self,
        project_id: str,
        query: str,
        top_k: int = 10,
        **filters,
    ) -> tuple[list[dict], float]:
        from retrieval.services.lexical import search_lexical

        return search_lexical(
            project_id=project_id,
            query=query,
            top_k=top_k,
            chunk_type=filters.get('chunk_type'),
            file_path_pattern=filters.get('file_path_pattern'),
        )


class HybridStrategy(RetrievalStrategy):
    """Combine vector + lexical results with Reciprocal Rank Fusion (RRF).

    Each sub-strategy is executed independently and results are merged so
    that chunks appearing in both lists receive a boosted combined score.
    """

    def __init__(self, rrf_k: int = 60) -> None:
        self._vector = VectorStrategy()
        self._lexical = LexicalStrategy()
        self._rrf_k = rrf_k

    def search(
        self,
        project_id: str,
        query: str,
        top_k: int = 10,
        **filters,
    ) -> tuple[list[dict], float]:
        # Retrieve from both pipelines.
        vector_results, vector_time = self._vector.search(
            project_id, query, top_k, **filters
        )
        lexical_results, lexical_time = self._lexical.search(
            project_id, query, top_k, **filters
        )

        merged = reciprocal_rank_fusion(
            vector_results,
            lexical_results,
            k=self._rrf_k,
        )

        total_time = vector_time + lexical_time

        logger.info(
            "Hybrid search: %d vector + %d lexical → %d merged in %.1fms",
            len(vector_results),
            len(lexical_results),
            len(merged[:top_k]),
            total_time,
        )

        return merged[:top_k], total_time


# ---------------------------------------------------------------------------
# Reciprocal Rank Fusion
# ---------------------------------------------------------------------------

def reciprocal_rank_fusion(
    vector_results: list[dict],
    lexical_results: list[dict],
    k: int = 60,
) -> list[dict]:
    """Merge two ranked result lists using Reciprocal Rank Fusion.

    For each list the score contribution of a result at rank *r* is
    ``1 / (k + r)`` where *k* is a smoothing constant (default 60).
    Results present in both lists receive the sum of both contributions.

    The returned list is sorted by descending RRF score.  Each result dict
    is augmented with:

    * ``rrf_score`` – the fused score.
    * ``retrieval_method`` – set to ``'hybrid'``.

    Args:
        vector_results: Ranked results from the vector strategy.
        lexical_results: Ranked results from the lexical strategy.
        k: RRF smoothing constant.  Higher values flatten the rank curve.

    Returns:
        A single merged list sorted by descending ``rrf_score``.
    """
    scores: dict[str, float] = {}
    chunk_map: dict[str, dict] = {}

    for rank, chunk in enumerate(vector_results, start=1):
        cid = chunk['chunk_id']
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank)
        chunk_map[cid] = chunk

    for rank, chunk in enumerate(lexical_results, start=1):
        cid = chunk['chunk_id']
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank)
        # Prefer the vector version if already present (has cosine score).
        if cid not in chunk_map:
            chunk_map[cid] = chunk

    # Build merged list sorted by RRF score.
    merged: list[dict] = []
    for cid, rrf_score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        result = {**chunk_map[cid]}
        result['rrf_score'] = round(rrf_score, 6)
        result['retrieval_method'] = 'hybrid'
        merged.append(result)

    return merged


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_STRATEGIES: dict[str, type[RetrievalStrategy]] = {
    'vector': VectorStrategy,
    'hybrid': HybridStrategy,
    'lexical': LexicalStrategy,
}


def get_strategy(mode: str) -> RetrievalStrategy:
    """Resolve a retrieval mode string to a concrete strategy instance.

    Args:
        mode: One of ``'vector'``, ``'lexical'``, or ``'hybrid'``.

    Returns:
        An instantiated :class:`RetrievalStrategy`.

    Raises:
        ValueError: If *mode* is not a recognised strategy name.
    """
    strategy_cls = _STRATEGIES.get(mode)
    if strategy_cls is None:
        raise ValueError(
            f"Unknown retrieval mode '{mode}'. "
            f"Expected one of: {', '.join(sorted(_STRATEGIES))}"
        )
    return strategy_cls()
