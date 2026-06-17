"""Abstract base class for generation providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class GenerationResult:
    """Result from an LLM generation call."""
    text: str
    model: str
    generation_time_ms: float
    token_count: int = 0
    raw_response: dict | None = None


class GenerationProvider(ABC):
    """Interface for LLM generation providers."""

    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = '') -> GenerationResult:
        """Generate a response given a prompt and optional system prompt."""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the model name."""
        ...
