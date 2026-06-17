"""Lightweight trace context for request-scoped tracing.

Provides structured timing and metadata collection for ingestion
and query flows, enabling end-to-end observability.
"""

import uuid
import time
import logging
from contextlib import contextmanager
from typing import Any

logger = logging.getLogger('reposage.trace')


class TraceContext:
    """Collects stage timings and metadata for a traceable operation.

    Usage:
        trace = TraceContext(operation='query')

        with trace.stage('retrieval'):
            results = search(...)

        with trace.stage('generation'):
            answer = generate(...)

        trace.record('chunks_retrieved', len(results))
        print(trace.to_dict())
    """

    def __init__(self, trace_id: str | None = None, operation: str = ''):
        self.trace_id = trace_id or str(uuid.uuid4())
        self.operation = operation
        self.stages: dict[str, float] = {}
        self.metadata: dict[str, Any] = {}
        self._start_time = time.perf_counter()

    def record(self, key: str, value: Any):
        """Record a metadata value."""
        self.metadata[key] = value

    @contextmanager
    def stage(self, name: str):
        """Context manager that records the wall-clock time of a stage in ms."""
        start = time.perf_counter()
        try:
            yield
        finally:
            elapsed_ms = (time.perf_counter() - start) * 1000
            self.stages[name] = round(elapsed_ms, 2)
            logger.info(
                f"[trace={self.trace_id[:8]}] "
                f"{self.operation}.{name}: {elapsed_ms:.1f}ms"
            )

    @property
    def total_ms(self) -> float:
        """Total elapsed time since trace creation."""
        return round((time.perf_counter() - self._start_time) * 1000, 2)

    def to_dict(self) -> dict:
        """Serialize trace context for storage or API response."""
        return {
            'trace_id': self.trace_id,
            'operation': self.operation,
            'stages': self.stages,
            'total_ms': self.total_ms,
            **self.metadata,
        }

    def to_log_prefix(self) -> str:
        """Short prefix for structured log lines."""
        return f"[trace={self.trace_id[:8]}]"
