# RepoSage 

**RepoSage** is a privacy-first, 100% local AI code assistant and code search engine built for engineering teams. It allows developers to index their proprietary repositories and ask complex questions without their code ever leaving their secure network. 

Say goodbye to scattered context and knowledge loss when team members switch projects or leave. RepoSage ensures your team’s knowledge remains queryable, grounded, and entirely local.

---

##  Key Features

* **100% Local Architecture:** Your code stays yours. Built with Ollama and pgvector, ensuring no data is ever sent to third-party LLM providers.
* **Advanced Retrieval Pipelines:** Supports Vector, Lexical (full-text), and Hybrid searches using Reciprocal Rank Fusion (RRF).
* **Cross-Encoder Reranking:** Ensures the most highly relevant code chunks are sent to the LLM for reasoning.
* **Deep Observability:** Tracks pipeline execution times, LLM generation latency, context tokens used, and specific file line numbers for perfect answer attribution.
* **Knowledge Drift Detection:** Tracks the specific parser, chunker, and embedding models used during ingestion to warn administrators when chunks become outdated.
* **Built-in Evaluation Engine:** Write test cases for your codebase and automatically measure retrieval recall, precision, and latency regression over time.

---

## 🛠️ Technology Stack

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

##  Repository Structure

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

##  Getting Started

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

This project is proprietary and intended for internal use unless specified otherwise.
