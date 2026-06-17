"""Sentence Transformers embedding provider — local, free, CPU-friendly."""

import logging
from sentence_transformers import SentenceTransformer
from .base import EmbeddingProvider

logger = logging.getLogger(__name__)


class SentenceTransformersProvider(EmbeddingProvider):
    """Embedding provider using Sentence Transformers (HuggingFace).

    Default model: all-MiniLM-L6-v2 (384 dimensions, ~80MB, fast on CPU).
    """

    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self._model_name = model_name
        self._model = None
        self._dimension = None

    def _load_model(self):
        """Lazy-load the model on first use."""
        if self._model is None:
            logger.info(f"Loading Sentence Transformers model: {self._model_name}")
            self._model = SentenceTransformer(self._model_name)
            # Determine dimension from a test embedding
            test = self._model.encode(['test'])
            self._dimension = len(test[0])
            logger.info(f"Model loaded. Dimension: {self._dimension}")

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts."""
        self._load_model()
        embeddings = self._model.encode(
            texts,
            batch_size=64,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return embeddings.tolist()

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query."""
        self._load_model()
        embedding = self._model.encode(
            [text],
            normalize_embeddings=True,
        )
        return embedding[0].tolist()

    @property
    def dimension(self) -> int:
        self._load_model()
        return self._dimension
