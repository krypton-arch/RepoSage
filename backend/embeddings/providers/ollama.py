"""Ollama embedding provider — local, free, requires Ollama running."""

import logging
import requests
from .base import EmbeddingProvider

logger = logging.getLogger(__name__)

# Known dimensions for Ollama embedding models
OLLAMA_MODEL_DIMENSIONS = {
    'nomic-embed-text': 768,
    'mxbai-embed-large': 1024,
    'all-minilm': 384,
    'snowflake-arctic-embed': 1024,
}


class OllamaEmbeddingProvider(EmbeddingProvider):
    """Embedding provider using Ollama's local API.

    Requires Ollama to be running with an embedding model pulled.
    Default model: nomic-embed-text (768 dimensions).
    """

    def __init__(self, model_name: str = 'nomic-embed-text', base_url: str = 'http://localhost:11434'):
        self._model_name = model_name
        self._base_url = base_url.rstrip('/')
        self._dimension = OLLAMA_MODEL_DIMENSIONS.get(model_name, 768)

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts (one at a time through Ollama API)."""
        embeddings = []
        for text in texts:
            embedding = self._embed_single(text)
            embeddings.append(embedding)
        return embeddings

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query."""
        return self._embed_single(text)

    def _embed_single(self, text: str) -> list[float]:
        """Call Ollama embeddings API for a single text."""
        try:
            response = requests.post(
                f"{self._base_url}/api/embed",
                json={
                    'model': self._model_name,
                    'input': text,
                },
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            return data['embeddings'][0]
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama embedding failed: {e}")
            raise RuntimeError(f"Failed to get embedding from Ollama: {e}") from e

    @property
    def dimension(self) -> int:
        return self._dimension
