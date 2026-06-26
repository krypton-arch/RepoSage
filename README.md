# RepoSage 

**RepoSage** is a specialized Source Code Retrieval-Augmented Generation (Code-RAG) Engine designed exclusively for strict, local-first environments. Operating entirely within air-gapped security networks, RepoSage allows engineering teams to semantically query their proprietary codebases without exposing intellectual property to third-party APIs.

Unlike generic knowledge management, wiki searchers, or task-tracking systems, RepoSage is purpose-built for code. It leverages deep Abstract Syntax Tree (AST) parsing, code-syntax semantics, and deterministic chunking strategies to understand the structural logic of repositories, firmly establishing it as a dedicated engineering tool rather than a generalized information retrieval system.

---

## Key Features

* **Strict Air-Gapped Security:** Your code never leaves the network. Built around Ollama and pgvector to guarantee a 100% local, zero-telemetry architecture.
* **Code-Syntax Semantic Understanding:** Focuses on code-specific retrieval through intelligent AST parsing, rather than generic text chunking, preserving the structural relationships between functions, classes, and dependencies.
* **Advanced Retrieval Pipelines:** Implements Vector, Lexical (BM25), and Hybrid searches using Reciprocal Rank Fusion (RRF) for precise code discovery.
* **Cross-Encoder Reranking:** Filters and reranks retrieved code chunks to ensure the LLM receives only the most highly relevant semantic context.
* **Deep Observability & Real-Time Polling:** Tracks pipeline execution times, LLM generation latency, and displays real-time ingestion progress directly in the web dashboard.
* **Knowledge Drift Detection:** Tracks the specific parser, chunker, and embedding models used during ingestion to warn administrators when chunks become outdated.
* **Built-in Evaluation Engine:** Write test cases and automatically evaluate responses using an automated **LLM-as-a-Judge** scoring system for Groundedness and Usefulness.
* **Dynamic UI Themes:** Supports instant, reload-free switching between Light and Dark mode aesthetics using Material Design 3 CSS Variables.
* **Local Credentials & Profiles:** Full JWT-based authentication system with secure profile stats visualization, ensuring strict air-gapped compatibility (no third-party OAuth).

---

## Technology Stack

**Frontend**
* Next.js 14 (App Router)
* React 18
* Tailwind CSS

**Backend**
* Django 5 & Django REST Framework (DRF)
* PostgreSQL 16 with `pgvector` extension
* `sentence-transformers` for embedding generation

**AI Engine**
* **Ollama**: Local LLM execution (e.g., Llama 3, Mistral, CodeQwen).
* **Cross-Encoders**: HuggingFace CrossEncoder models for state-of-the-art chunk reranking.

---

## Repository Structure

```
RepoSage/
├── backend/            # Django REST API
│   ├── projects/       # Repository management & ACL
│   ├── ingestion/      # Semantic chunking, parsing, and indexing
│   ├── retrieval/      # Hybrid search & Cross-Encoder reranking
│   ├── generation/     # Prompt assembly & Ollama integration
│   ├── evaluation/     # Benchmarking and test cases
│   └── common/         # Telemetry, rate limiting, versioning
├── frontend/           # Next.js Application
│   ├── src/app/        # Pages & Routing
│   └── src/lib/        # API client and utilities
├── documentation/      # Detailed architectural documentation
└── docker-compose.yml  # pgvector & local services configuration
```

For a deep dive into how RepoSage works under the hood, check out the [Documentation folder](./documentation/) which includes detailed breakdowns of the architecture, ingestion pipeline, retrieval techniques, and observability metrics.

---

## Getting Started

### Prerequisites
* Docker and Docker Compose
* Python 3.11+
* Node.js 20+
* Local installation of [Ollama](https://ollama.com/)

### 1. Database Setup
Start the pgvector database:
```bash
docker-compose up -d
```

### 2. Backend Setup
Navigate to the backend, set up a virtual environment, and install dependencies:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations and start the server
python manage.py migrate
python manage.py runserver
```

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
npm run dev
```

### 4. Configure Ollama
Ensure Ollama is running locally and pull your preferred embedding and generation models:
```bash
ollama run mistral
```

---

##  License

MIT License
