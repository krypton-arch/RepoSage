"""Reranker service — pluggable cross-encoder reranking.

Supports two providers:

* ``none`` – no reranking (passthrough).
* ``cross_encoder`` – reranks using a sentence-transformers cross-encoder
  model, loaded lazily on first invocation.

The active provider is selected via the ``RERANKER_PROVIDER`` Django setting.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from django.conf import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class RerankerProvider(ABC):
    """Interface for all reranker implementations."""

    @abstractmethod
    def rerank(
        self,
        query: str,
        chunks: list[dict],
        top_k: int | None = None,
    ) -> list[dict]:
        """Rerank *chunks* with respect to *query*.

        Implementations must return a new list (may share dict references)
        sorted by relevance.  If *top_k* is given, only the top-k results
        are returned.
        """


# ---------------------------------------------------------------------------
# Concrete providers
# ---------------------------------------------------------------------------

class NoOpReranker(RerankerProvider):
    """No reranking — returns chunks unchanged (optionally truncated)."""

    def rerank(
        self,
        query: str,
        chunks: list[dict],
        top_k: int | None = None,
    ) -> list[dict]:
        if top_k is not None:
            return chunks[:top_k]
        return chunks


class CrossEncoderReranker(RerankerProvider):
    """Cross-encoder reranker using ``sentence-transformers``.

    The model is loaded lazily on the first call to :meth:`rerank` to avoid
    startup cost when the reranker is not actually used.

    Each result dict is augmented with a ``rerank_score`` key and the list
    is sorted by that score in descending order.
    """

    def __init__(self, model_name: str | None = None) -> None:
        self._model_name = model_name or getattr(
            settings, 'RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-6-v2'
        )
        self._model = None  # lazy-loaded

    def _load_model(self):
        """Load the cross-encoder model on first use."""
        if self._model is not None:
            return

        try:
            from sentence_transformers import CrossEncoder  # type: ignore[import-untyped]

            logger.info("Loading cross-encoder model '%s'…", self._model_name)
            self._model = CrossEncoder(self._model_name)
            logger.info("Cross-encoder model loaded successfully.")
        except ImportError:
            logger.error(
                "sentence-transformers is not installed. "
                "Install it with: pip install sentence-transformers"
            )
            raise
        except Exception:
            logger.exception("Failed to load cross-encoder model '%s'", self._model_name)
            raise

    def rerank(
        self,
        query: str,
        chunks: list[dict],
        top_k: int | None = None,
    ) -> list[dict]:
        if not chunks:
            return []

        self._load_model()

        # Build (query, chunk_content) pairs for scoring.
        pairs = [(query, chunk['content']) for chunk in chunks]
        scores = self._model.predict(pairs)  # type: ignore[union-attr]

        # Attach scores and sort.
        scored_chunks: list[dict] = []
        for chunk, score in zip(chunks, scores):
            enriched = {**chunk, 'rerank_score': round(float(score), 6)}
            scored_chunks.append(enriched)

        scored_chunks.sort(key=lambda c: c['rerank_score'], reverse=True)

        logger.info(
            "Cross-encoder reranked %d chunks (top score=%.4f, bottom=%.4f)",
            len(scored_chunks),
            scored_chunks[0]['rerank_score'] if scored_chunks else 0,
            scored_chunks[-1]['rerank_score'] if scored_chunks else 0,
        )

        if top_k is not None:
            return scored_chunks[:top_k]
        return scored_chunks


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_PROVIDERS: dict[str, type[RerankerProvider]] = {
    'none': NoOpReranker,
    'cross_encoder': CrossEncoderReranker,
}

# Cached singleton
_provider_instance: RerankerProvider | None = None


def get_reranker() -> RerankerProvider:
    """Return the configured reranker provider (singleton).

    The provider type is read from ``settings.RERANKER_PROVIDER``
    (default ``'none'``).
    """
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_name = getattr(settings, 'RERANKER_PROVIDER', 'none')
    provider_cls = _PROVIDERS.get(provider_name)

    if provider_cls is None:
        raise ValueError(
            f"Unknown reranker provider '{provider_name}'. "
            f"Expected one of: {', '.join(sorted(_PROVIDERS))}"
        )

    _provider_instance = provider_cls()
    logger.info("Reranker provider initialised: %s", provider_name)
    return _provider_instance


# ---------------------------------------------------------------------------
# Backward-compatible top-level function
# ---------------------------------------------------------------------------

def rerank(
    query: str,
    chunks: list[dict],
    top_k: int | None = None,
) -> list[dict]:
    """Rerank chunks using the configured provider.

    This function preserves backward compatibility with existing callers
    that import ``rerank`` directly from this module.
    """
    return get_reranker().rerank(query, chunks, top_k)
