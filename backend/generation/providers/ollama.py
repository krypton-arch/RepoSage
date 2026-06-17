"""Ollama generation provider — local LLM inference, free."""

import logging
import time
import requests
from .base import GenerationProvider, GenerationResult

logger = logging.getLogger(__name__)


class OllamaGenerationProvider(GenerationProvider):
    """Generation provider using Ollama's local API.

    Supports any model available in Ollama: mistral, llama3.2, etc.
    """

    def __init__(self, model_name: str = 'mistral', base_url: str = 'http://localhost:11434'):
        self._model_name = model_name
        self._base_url = base_url.rstrip('/')

    def generate(self, prompt: str, system_prompt: str = '') -> GenerationResult:
        """Generate a response using Ollama."""
        start_time = time.time()

        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})

        try:
            response = requests.post(
                f"{self._base_url}/api/chat",
                json={
                    'model': self._model_name,
                    'messages': messages,
                    'stream': False,
                    'options': {
                        'temperature': 0.1,
                        'top_p': 0.9,
                        'num_predict': 2048,
                    },
                },
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()

            generation_time = (time.time() - start_time) * 1000
            answer_text = data.get('message', {}).get('content', '')
            eval_count = data.get('eval_count', 0)

            return GenerationResult(
                text=answer_text,
                model=self._model_name,
                generation_time_ms=round(generation_time, 1),
                token_count=eval_count,
                raw_response=data,
            )

        except requests.exceptions.ConnectionError:
            logger.warning("Ollama is not running. Returning retrieval-only result.")
            return GenerationResult(
                text="[Generation unavailable — Ollama is not running. Showing retrieval results only.]",
                model=self._model_name,
                generation_time_ms=0,
                token_count=0,
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama generation failed: {e}")
            return GenerationResult(
                text=f"[Generation failed: {str(e)}]",
                model=self._model_name,
                generation_time_ms=(time.time() - start_time) * 1000,
                token_count=0,
            )

    @property
    def model_name(self) -> str:
        return self._model_name
