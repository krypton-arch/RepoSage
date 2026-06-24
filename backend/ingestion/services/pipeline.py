"""Ingestion pipeline — orchestrates discover → register → parse → chunk → embed → store.

This is the core pipeline for a project's ingestion run.  It supports:
- **Version stamping** on jobs, documents, and chunks.
- **Stage timing** via ``TraceContext`` for observability.
- **Checkpoint / resume** so that a partially-failed run can restart
  from where it left off.
- **Structured error details** instead of flat strings.
- **Partial-success** status when some files succeed and others fail.
- **Embedding cache** to skip re-embedding identical content.
- **Limits enforcement** to prevent resource exhaustion.
"""

import logging
import time
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from common.limits import enforce_limit
from common.tracing import TraceContext
from common.versioning import get_current_versions
from embeddings.cache import compute_content_hash, get_cached_embeddings, store_embeddings
from embeddings.services import embed_texts
from ingestion.models import DocumentChunk, IngestionJob, SourceDocument
from ingestion.services.chunker import chunk_sections
from ingestion.services.file_handler import (
    discover_files,
    get_project_upload_dir,
    register_documents,
)
from ingestion.services.parser import parse_file

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _classify_error(exc: Exception) -> str:
    """Return a category string for a processing exception."""
    name = type(exc).__name__.lower()
    msg = str(exc).lower()
    if "encode" in name or "codec" in msg or "decode" in msg:
        return "encoding_error"
    if "size" in msg or "limit" in msg or "too large" in msg:
        return "size_limit"
    return "parse_error"


def _stamp_job_versions(job: IngestionJob, versions: dict) -> None:
    """Snapshot current pipeline versions onto the job."""
    job.embedding_model = versions["embedding_model"]
    job.parser_version = versions["parser_version"]
    job.chunker_version = versions["chunker_version"]
    job.embedding_version = versions["embedding_version"]


def _stamp_document_versions(
    doc: SourceDocument,
    versions: dict,
) -> None:
    """Stamp version metadata onto a SourceDocument."""
    doc.parser_version = versions["parser_version"]
    doc.chunker_version = versions["chunker_version"]
    doc.embedding_model = versions["embedding_model"]
    doc.embedding_version = versions["embedding_version"]
    doc.indexed_at = timezone.now()


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_ingestion(
    project,
    job: IngestionJob | None = None,
    resume: bool = False,
) -> IngestionJob:
    """Run the full ingestion pipeline for *project*.

    Args:
        project: The ``Project`` instance to ingest.
        job: An existing ``IngestionJob`` to continue, or *None* to
             create a new one.
        resume: When *True*, skip documents whose ``str(doc.id)`` is
                already in ``job.completed_file_ids``.

    Returns:
        The finalised ``IngestionJob``.

    Steps:
        1. Discover files in the project upload directory.
        2. Register documents (with deduplication).
        3. Parse each document into sections.
        4. Chunk parsed sections.
        5. Embed all chunks (with cache).
        6. Store chunks with embeddings in the database.
    """
    start_time = time.time()
    versions = get_current_versions()

    # ------------------------------------------------------------------
    # Job setup
    # ------------------------------------------------------------------
    if job is None:
        job = IngestionJob.objects.create(
            project=project,
            status=IngestionJob.Status.RUNNING,
            started_at=timezone.now(),
        )
    else:
        job.status = IngestionJob.Status.RUNNING
        job.started_at = timezone.now()
        job.save()

    _stamp_job_versions(job, versions)

    trace = TraceContext(
        trace_id=str(job.trace_id),
        operation="ingestion",
    )

    # Ensure mutable defaults are real lists/dicts on resume.
    if not isinstance(job.completed_file_ids, list):
        job.completed_file_ids = []
    if not isinstance(job.error_details, list):
        job.error_details = []

    job.save()

    project.status = "ingesting"
    project.save()

    try:
        # --------------------------------------------------------------
        # Stage 1 — Discover
        # --------------------------------------------------------------
        with trace.stage("discover"):
            upload_dir = get_project_upload_dir(str(project.id))
            file_infos = discover_files(upload_dir)
            enforce_limit("MAX_FILES_PER_PROJECT", len(file_infos))

        job.total_files = len(file_infos)
        job.save()

        if not file_infos:
            job.status = IngestionJob.Status.COMPLETED
            job.error_log = "No files found to ingest."
            job.completed_at = timezone.now()
            job.duration_seconds = time.time() - start_time
            job.stage_timings = trace.stages
            job.save()
            project.status = "indexed"
            project.save()
            return job

        # --------------------------------------------------------------
        # Stage 2 — Register
        # --------------------------------------------------------------
        with trace.stage("register"):
            documents = register_documents(project, file_infos)

        # Build the set of already-completed doc ids (for resume).
        completed_ids: set[str] = set(job.completed_file_ids) if resume else set()

        # --------------------------------------------------------------
        # Stage 3-4 — Parse & chunk each document
        # --------------------------------------------------------------
        all_chunks_data: list[tuple[SourceDocument, object]] = []

        with trace.stage("parse_chunk"):
            for doc in documents:
                doc_id_str = str(doc.id)

                # Resume support — skip already-completed documents.
                if resume and doc_id_str in completed_ids:
                    logger.info("Resuming: skipping already-completed %s", doc.file_path)
                    continue

                try:
                    with transaction.atomic():
                        doc.status = SourceDocument.Status.PROCESSING
                        doc.save()

                        # Read file content
                        full_path = Path(upload_dir) / doc.file_path
                        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                            content = f.read()

                        # Parse
                        sections = parse_file(doc.file_path, content, doc.language)

                        # Chunk
                        chunks = chunk_sections(
                            sections=sections,
                            file_type=doc.file_type,
                            file_path=doc.file_path,
                            language=doc.language,
                            max_tokens=getattr(settings, "CHUNK_MAX_TOKENS", 500),
                            overlap_tokens=getattr(settings, "CHUNK_OVERLAP_TOKENS", 50),
                        )

                        for chunk in chunks:
                            all_chunks_data.append((doc, chunk))

                        # Stamp versions and mark indexed.
                        _stamp_document_versions(doc, versions)
                        doc.status = SourceDocument.Status.INDEXED
                        doc.save()

                        job.processed_files += 1

                        # Checkpoint — record this document as completed.
                        job.completed_file_ids.append(doc_id_str)
                        job.save()

                except Exception as e:
                    logger.error("Failed to process %s: %s", doc.file_path, e)
                    doc.status = SourceDocument.Status.FAILED
                    doc.save()

                    job.failed_files += 1
                    job.error_details.append({
                        "file": doc.file_path,
                        "stage": "parse_chunk",
                        "error": str(e),
                        "category": _classify_error(e),
                    })
                    job.save()

        # --------------------------------------------------------------
        # Stage 5 — Embed (with cache)
        # --------------------------------------------------------------
        if all_chunks_data:
            with trace.stage("embed"):
                model_name = versions["embedding_model"]
                chunk_texts = [c.content for _, c in all_chunks_data]

                # Compute content hashes for every chunk.
                content_hashes = [compute_content_hash(t) for t in chunk_texts]

                # Batch cache lookup.
                cached = get_cached_embeddings(content_hashes, model_name)
                logger.info(
                    "Embedding cache: %d/%d hits",
                    len(cached),
                    len(content_hashes),
                )

                # Identify texts that need fresh embedding.
                miss_indices = [
                    i for i, h in enumerate(content_hashes) if h not in cached
                ]
                miss_texts = [chunk_texts[i] for i in miss_indices]

                # Embed only the misses.
                if miss_texts:
                    try:
                        new_embeddings = embed_texts(miss_texts)
                    except Exception as e:
                        logger.error("Embedding failed: %s", e)
                        job.error_details.append({
                            "file": "__batch__",
                            "stage": "embed",
                            "error": str(e),
                            "category": "embed_error",
                        })
                        new_embeddings = [None] * len(miss_texts)  # type: ignore[list-item]

                    # Store freshly-computed embeddings in cache.
                    pairs_to_cache = [
                        (content_hashes[miss_indices[j]], emb)
                        for j, emb in enumerate(new_embeddings)
                        if emb is not None
                    ]
                    if pairs_to_cache:
                        store_embeddings(pairs_to_cache, model_name)

                    # Merge new embeddings back into the full list keyed by hash.
                    for j, idx in enumerate(miss_indices):
                        emb = new_embeddings[j]
                        if emb is not None:
                            cached[content_hashes[idx]] = emb

                # Build final embeddings list aligned with all_chunks_data.
                embeddings: list[list[float] | None] = [
                    cached.get(h) for h in content_hashes
                ]

            # ----------------------------------------------------------
            # Stage 6 — Store
            # ----------------------------------------------------------
            with trace.stage("store"):
                chunk_objects: list[DocumentChunk] = []
                for i, (doc, chunk_data) in enumerate(all_chunks_data):
                    embedding = embeddings[i]
                    chunk_obj = DocumentChunk(
                        document=doc,
                        project=project,
                        chunk_index=chunk_data.chunk_index,
                        content=chunk_data.content,
                        heading_context=chunk_data.heading_context,
                        symbol_context=chunk_data.symbol_context,
                        chunk_type=chunk_data.chunk_type,
                        start_line=chunk_data.start_line,
                        end_line=chunk_data.end_line,
                        token_count=chunk_data.token_count,
                        char_count=chunk_data.char_count,
                        metadata=chunk_data.metadata,
                        embedding=embedding,
                        # Version / cache stamps
                        embedding_model=versions["embedding_model"],
                        embedding_version=versions["embedding_version"],
                        content_hash=content_hashes[i],
                    )
                    chunk_objects.append(chunk_obj)

                with transaction.atomic():
                    DocumentChunk.objects.bulk_create(chunk_objects, batch_size=100)
                    job.total_chunks_created = len(chunk_objects)

        # --------------------------------------------------------------
        # Finalise
        # --------------------------------------------------------------
        duration = time.time() - start_time
        job.stage_timings = trace.stages
        job.completed_at = timezone.now()
        job.duration_seconds = round(duration, 2)

        # Partial-success when some files failed but others succeeded.
        if job.failed_files > 0 and job.processed_files > 0:
            job.status = IngestionJob.Status.PARTIAL_SUCCESS
        else:
            job.status = IngestionJob.Status.COMPLETED

        # Legacy error_log — still populated for backwards compatibility.
        if job.error_details:
            job.error_log = "\n".join(
                f"{e['file']}: [{e['category']}] {e['error']}"
                for e in job.error_details
            )

        job.save()

        # Update project stats.
        project.total_files = project.documents.filter(status="indexed").count()
        project.total_chunks = project.chunks.count()
        project.last_indexed_at = timezone.now()
        project.status = "indexed"
        project.save()

        logger.info(
            "Ingestion complete for %s: "
            "%d files, %d chunks, %d failures, %.1fs",
            project.name,
            job.processed_files,
            job.total_chunks_created,
            job.failed_files,
            duration,
        )

        return job

    except Exception as e:
        logger.error("Ingestion pipeline failed: %s", e)
        job.status = IngestionJob.Status.FAILED
        job.error_log = str(e)
        job.stage_timings = trace.stages
        job.completed_at = timezone.now()
        job.duration_seconds = time.time() - start_time
        job.save()
        project.status = "failed"
        project.save()
        raise
