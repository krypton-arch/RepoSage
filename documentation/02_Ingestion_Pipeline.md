# Ingestion Pipeline

The Ingestion Pipeline is responsible for processing source code and documents into searchable, embedded vectors.

## Workflow

1. **File Upload & Registration**: Files are uploaded (individually or via ZIP) to the `/api/ingestion/.../upload/` endpoint. `services.file_handler` registers them as `SourceDocument` records.
2. **Parsing**: `services.parser` reads the file content.
3. **Chunking**: `services.chunker` splits the content into `DocumentChunk` records. It applies semantic splitting, capturing context like surrounding functions or headings.
4. **Hashing & Caching**: Before embedding, a SHA-256 hash of the chunk content is computed. The `embeddings.cache` checks if this hash exists in the `EmbeddingCache` table.
5. **Embedding**: If the hash is new, `embeddings.services` calls the local embedding provider (e.g., `sentence-transformers`) to generate the vector.
6. **Storage**: The vector is stored in the cache and linked to the `DocumentChunk` in PostgreSQL (`pgvector`).

## Resilience & Resume Capability

The pipeline runs as an asynchronous or background job (`IngestionJob`). It tracks `processed_files` and `failed_files`. 
If a job is interrupted, the `trigger_ingestion(resume=True, job_id=...)` functionality allows the pipeline to skip already processed files, utilizing the `EmbeddingCache` to avoid expensive re-embedding.

## Staleness Tracking
Each chunk records the `parser_version` and `chunker_version` used during its creation. The `common.versioning` module can generate staleness reports to alert administrators if chunks were processed with outdated logic.

## Real-Time Progress Tracking
When a user uploads files through the UI, the frontend initiates a polling mechanism (`ingestion.listJobs(projectId)`) to monitor active background tasks. 
An `IngestionProgressBar` visually indicates the percentage of files processed, failed, and pending in real-time, providing deep transparency into the vectorization pipeline state.
