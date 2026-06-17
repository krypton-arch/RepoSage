"""Embedding cache — hash-based deduplication for embedding vectors.

Provides helpers to compute content hashes, look up cached embeddings,
and store new embeddings.  Used by the ingestion pipeline to skip
embedding calls when identical text has already been embedded.
"""

import hashlib
import logging
from typing import Any

logger = logging.getLogger(__name__)


def compute_content_hash(text: str) -> str:
    """Return the SHA-256 hex digest of *text*.

    This hash is the cache key used to deduplicate embeddings across
    chunks, documents, and re-indexing runs.
    """
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def get_cached_embeddings(
    content_hashes: list[str],
    model: str,
) -> dict[str, list[float]]:
    """Batch-lookup cached embeddings by content hash + model.

    Args:
        content_hashes: SHA-256 hashes of the chunk texts to look up.
        model: The embedding model name (must match exactly).

    Returns:
        A dict mapping ``content_hash → embedding vector`` for every
        cache hit.  Misses are simply absent from the dict.
    """
    # Lazy import to avoid circular imports at module load time.
    from ingestion.models import EmbeddingCache

    if not content_hashes:
        return {}

    hits = EmbeddingCache.objects.filter(
        content_hash__in=content_hashes,
        embedding_model=model,
    ).values_list("content_hash", "embedding")

    result: dict[str, list[float]] = {}
    for content_hash, embedding in hits:
        if embedding is not None:
            # VectorField may return a numpy array or a plain list
            # depending on the pgvector adapter version.  Normalise to
            # list[float] for consistency.
            result[content_hash] = (
                embedding.tolist()
                if hasattr(embedding, "tolist")
                else list(embedding)
            )
    logger.debug(
        "Embedding cache: %d/%d hits for model=%s",
        len(result),
        len(content_hashes),
        model,
    )
    return result


def store_embeddings(
    hash_embedding_pairs: list[tuple[str, list[float]]],
    model: str,
) -> int:
    """Batch-store embedding vectors into the cache.

    Existing entries (same ``content_hash + model``) are silently
    skipped via ``ignore_conflicts=True``.

    Args:
        hash_embedding_pairs: Pairs of ``(content_hash, embedding)``.
        model: The embedding model name.

    Returns:
        Number of rows actually created (excludes ignored conflicts).
    """
    from ingestion.models import EmbeddingCache

    if not hash_embedding_pairs:
        return 0

    cache_objects = [
        EmbeddingCache(
            content_hash=content_hash,
            embedding_model=model,
            embedding=embedding,
            dimension=len(embedding),
        )
        for content_hash, embedding in hash_embedding_pairs
    ]

    created = EmbeddingCache.objects.bulk_create(
        cache_objects,
        batch_size=200,
        ignore_conflicts=True,
    )
    logger.info(
        "Embedding cache: stored %d new entries for model=%s",
        len(created),
        model,
    )
    return len(created)
