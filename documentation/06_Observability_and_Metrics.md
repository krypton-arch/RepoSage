# Observability and Metrics

RepoSage is designed for high observability, ensuring that system administrators can monitor system health, detect performance degradation, and manage knowledge drift.

## Staleness and Knowledge Drift

In a RAG system, "knowledge drift" occurs when the underlying models (parsers, chunkers, embedders) are updated, but older vectors remain in the database.
*   **Version Constants**: `common.versioning` maintains the `CURRENT_EMBEDDING_VERSION`, `CURRENT_PARSER_VERSION`, and `CURRENT_CHUNKER_VERSION`.
*   **Staleness Reporting**: The `/api/projects/<id>/staleness/` endpoint calculates how many chunks in a project were processed with outdated logic. 
*   This allows the frontend Dashboard to alert administrators when a re-index is highly recommended.

## Pipeline Traceability

Every query response exposes a `trace_id` and rich metadata to the frontend.
*   **Split Latency**: Time spent specifically in retrieval vs. generation.
*   **Token Metrics**: An estimate of `context_tokens_used` for the retrieved chunks.
*   **Source Attribution**: Detailed `RetrievedChunkLog` entries link exactly which file, line numbers, and token counts were sent to the LLM for every single question asked.

These metrics ensure that when answers degrade in quality, developers can quickly isolate whether the retriever failed to find the right file or the LLM failed to reason over the provided context.
