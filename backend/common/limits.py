"""Configurable limits to prevent resource exhaustion.

All limits are configurable via settings.py / .env.
Enforcement is done at the service layer before expensive operations.
"""

from django.conf import settings


def _get(name: str, default: int) -> int:
    return int(getattr(settings, name, default))


# --- Limit accessors (lazy, read from settings) ---

def max_files_per_project() -> int:
    return _get('MAX_FILES_PER_PROJECT', 2000)

def max_file_size_bytes() -> int:
    return _get('MAX_FILE_SIZE_BYTES', 1_048_576)  # 1 MB

def max_chunk_tokens() -> int:
    return _get('MAX_CHUNK_TOKENS', 1000)

def max_top_k() -> int:
    return _get('MAX_TOP_K', 50)

def max_context_tokens() -> int:
    return _get('MAX_CONTEXT_TOKENS', 4000)

def max_question_length() -> int:
    return _get('MAX_QUESTION_LENGTH', 2000)


class LimitExceededError(Exception):
    """Raised when a configurable limit is exceeded."""

    def __init__(self, limit_name: str, actual: int, maximum: int):
        self.limit_name = limit_name
        self.actual = actual
        self.maximum = maximum
        super().__init__(
            f"{limit_name}: {actual} exceeds maximum of {maximum}"
        )


def enforce_limit(name: str, value: int):
    """Check a value against the named limit, raise if exceeded.

    Usage:
        enforce_limit('MAX_FILES_PER_PROJECT', len(file_infos))
    """
    limit_map = {
        'MAX_FILES_PER_PROJECT': max_files_per_project,
        'MAX_FILE_SIZE_BYTES': max_file_size_bytes,
        'MAX_CHUNK_TOKENS': max_chunk_tokens,
        'MAX_TOP_K': max_top_k,
        'MAX_CONTEXT_TOKENS': max_context_tokens,
        'MAX_QUESTION_LENGTH': max_question_length,
    }
    getter = limit_map.get(name)
    if getter is None:
        raise ValueError(f"Unknown limit: {name}")
    maximum = getter()
    if value > maximum:
        raise LimitExceededError(name, value, maximum)


def get_all_limits() -> dict:
    """Return all current limit values as a dict (useful for API/debug)."""
    return {
        'MAX_FILES_PER_PROJECT': max_files_per_project(),
        'MAX_FILE_SIZE_BYTES': max_file_size_bytes(),
        'MAX_CHUNK_TOKENS': max_chunk_tokens(),
        'MAX_TOP_K': max_top_k(),
        'MAX_CONTEXT_TOKENS': max_context_tokens(),
        'MAX_QUESTION_LENGTH': max_question_length(),
    }
