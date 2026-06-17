# Architecture Overview

RepoSage is a fully local, privacy-preserving AI code assistant designed for engineering teams. It operates entirely on local infrastructure, ensuring that sensitive proprietary code never leaves the company's servers.

## Core Components

1. **Frontend**: Next.js 14 application with React 18, providing the user interface for project management, querying, and evaluation.
2. **Backend**: Django 5 REST API using Django Rest Framework (DRF).
3. **Database**: PostgreSQL 16 equipped with the `pgvector` extension for storing and performing similarity searches on vector embeddings.
4. **LLM Engine**: Ollama running locally for generation, paired with `sentence-transformers` for embedding generation.

## Key Backend Apps

*   **`projects`**: Manages repositories/projects, their retrieval settings (Vector, Hybrid, RRF), and access control lists (ACL).
*   **`ingestion`**: Handles file uploads, parsing, semantic chunking, and orchestrates the embedding pipeline.
*   **`embeddings`**: Abstracts embedding generation (SentenceTransformers or Ollama) and implements an `EmbeddingCache` to avoid re-embedding identical text chunks.
*   **`retrieval`**: Executes search strategies. Supports lexical (full-text), vector (cosine similarity via pgvector), and hybrid searches combined via Reciprocal Rank Fusion (RRF), followed by Cross-Encoder reranking.
*   **`generation`**: Constructs prompts from retrieved chunks and interfaces with Ollama to stream or generate final answers.
*   **`query`**: Tracks user questions, generated answers, similarity scores, and execution telemetry (latencies, token counts).
*   **`evaluation`**: An automated benchmarking suite to run test cases against the pipeline and measure retrieval precision, recall, and latency degradation over time.
*   **`common`**: Shared infrastructure including telemetry, versioning constraints, and rate limiting.

## Local-Only Promise
By isolating PostgreSQL, Ollama, and the Django API within a local Dockerized environment, RepoSage guarantees 100% data residency.
