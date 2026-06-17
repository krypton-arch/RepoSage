"""Embedding service — factory and batch embedding logic."""

import logging
from django.conf import settings
from .providers.base import EmbeddingProvider
from .providers.sentence_transformers import SentenceTransformersProvider
from .providers.ollama import OllamaEmbeddingProvider

logger = logging.getLogger(__name__)

# Singleton instance
_provider_instance: EmbeddingProvider | None = None


def get_embedding_provider() -> EmbeddingProvider:
    """Get the configured embedding provider (singleton)."""
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_type = getattr(settings, 'EMBEDDING_PROVIDER', 'sentence_transformers')
    model_name = getattr(settings, 'EMBEDDING_MODEL', 'all-MiniLM-L6-v2')

    if provider_type == 'sentence_transformers':
        _provider_instance = SentenceTransformersProvider(model_name=model_name)
    elif provider_type == 'ollama':
        base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        _provider_instance = OllamaEmbeddingProvider(model_name=model_name, base_url=base_url)
    else:
        raise ValueError(f"Unknown embedding provider: {provider_type}")

    logger.info(f"Initialized embedding provider: {provider_type} ({model_name})")
    return _provider_instance


def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Embed a list of texts in batches."""
    provider = get_embedding_provider()
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_embeddings = provider.embed(batch)
        all_embeddings.extend(batch_embeddings)

    return all_embeddings


def embed_query(text: str) -> list[float]:
    """Embed a single query text."""
    provider = get_embedding_provider()
    return provider.embed_query(text)
