# Query and Generation

Once relevant chunks are retrieved, they are assembled and passed to the local LLM to generate a grounded, accurate answer.

## Telemetry and `TraceContext`

Every query execution is wrapped in a `TraceContext` (`common.tracing`). This context tracks:
*   `retrieval_time_ms`: Time taken to search and rerank chunks.
*   `generation_time_ms`: Time taken by the LLM to generate the answer.
*   `context_tokens`: The estimated number of tokens consumed by the retrieved chunks.

## Generation Pipeline

1. **Context Assembly**: `retrieval.services.context_assembler` formats the retrieved `DocumentChunk` records into a single context string, appending metadata like file paths and line numbers.
2. **Prompting**: `generation.prompts.grounded_qa` combines the user's question, the assembled context, and system instructions directing the LLM to *only* answer based on the provided context.
3. **Inference**: `generation.providers.ollama` sends the prompt to the local Ollama instance.
4. **Session Logging**: The result is saved as a `QuerySession`, which logs the question, answer, confidence level, latencies, and creates `RetrievedChunkLog` entries for full observability of exactly which code snippets informed the answer.

## Confidence Scoring
The backend calculates a heuristic `confidence_level` (High, Medium, Low) based on the maximum similarity score of the retrieved chunks, helping users gauge the reliability of the answer.
