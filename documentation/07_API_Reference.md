# API Reference

RepoSage exposes a RESTful API over HTTP. The backend is built on Django REST Framework (DRF) and the Next.js frontend communicates with it via a proxy path (`/api`).

All endpoints listed below are prefixed with `/api` when accessed from the Next.js frontend, or directly via the Django backend port (default: 8000) omitting the `/api` prefix (e.g. `http://localhost:8000/projects/`).

## 1. Projects API

Manages repositories/projects, their metadata, and configuration settings.

* **`GET /projects/`**: List all projects.
* **`POST /projects/`**: Create a new project.
  * **Payload**: `{ "name": "string", "description": "string", "source_type": "string" }`
* **`GET /projects/:id/`**: Retrieve a specific project.
* **`PATCH /projects/:id/`**: Update a project's details (e.g., name, description).
* **`DELETE /projects/:id/`**: Delete a project and all associated data.
* **`GET /projects/:id/stats/`**: Retrieve statistics for a project (file count, chunk count, tokens, queries, etc).
* **`PATCH /projects/:id/settings/`**: Update retrieval settings (e.g. `retrieval_mode`, `retrieval_top_k`, `max_context_tokens`).
* **`GET /projects/:id/staleness/`**: Retrieve a staleness report (drift detection for parser, chunker, and embedding models).

## 2. Ingestion API

Handles the upload and processing (parsing, chunking, embedding) of files into the pgvector database.

* **`POST /ingestion/projects/:id/upload/`**: Upload raw files to a project.
  * **Payload**: `multipart/form-data` with `files` array.
* **`POST /ingestion/projects/:id/upload-zip/`**: Upload an archive/zip file.
  * **Payload**: `multipart/form-data` with a single `file`.
* **`POST /ingestion/projects/:id/ingest/`**: Trigger the ingestion pipeline (parsing, chunking, embedding) for uploaded files.
  * **Payload**: Optional `{ "resume": boolean, "job_id": "string" }`
* **`GET /ingestion/projects/:id/jobs/`**: List all ingestion jobs for the project.
* **`GET /ingestion/projects/:id/jobs/:jobId/`**: Get the status and logs of a specific ingestion job.
* **`GET /ingestion/projects/:id/documents/`**: List all source documents uploaded for a project.
* **`GET /ingestion/projects/:id/documents/:docId/chunks/`**: List the embedded chunks for a specific document.

## 3. Query & Generation API

Handles hybrid search retrieval and LLM answer generation.

* **`POST /query/projects/:id/query/`**: Ask a question about the codebase. Triggers the full Retrieval-Augmented Generation (RAG) pipeline.
  * **Payload**: `{ "question": "string", "top_k": number }`
  * **Returns**: The generated answer, confidence level, processing latencies, and an array of `retrieved_chunks` with specific file paths and line ranges.
* **`GET /query/projects/:id/queries/`**: List past query sessions (history).
* **`GET /query/projects/:id/queries/:queryId/`**: Retrieve the details and citations of a past query session.

## 4. Evaluation API

Allows users to create test cases and evaluate retrieval precision, recall, and LLM generated answers over time.

* **`GET /evaluation/projects/:id/evaluation/cases/`**: List evaluation test cases.
* **`POST /evaluation/projects/:id/evaluation/cases/`**: Create a new evaluation test case.
  * **Payload**: `{ "question": "string", "expected_answer_traits": "string", "expected_source_files": ["string"] }`
* **`POST /evaluation/projects/:id/evaluation/run/`**: Run the evaluation engine against all test cases.
  * **Payload**: `{ "top_k": number }`
* **`GET /evaluation/projects/:id/evaluation/cases/:caseId/runs/`**: List past evaluation runs for a specific case.
* **`GET /evaluation/projects/:id/evaluation/compare/`**: Compare two evaluation runs side-by-side to detect performance regressions.
  * **Query Params**: `?run_a=<id>&run_b=<id>`

## 5. Dashboard API

System-wide observability.

* **`GET /dashboard/`**: Retrieves aggregate statistics across all projects (total projects, files, chunks, queries, recent failed jobs).
