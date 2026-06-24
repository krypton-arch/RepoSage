# Developer Setup Guide

This guide provides step-by-step instructions for getting the RepoSage environment running locally on your machine for development and testing.

## Prerequisites

Ensure you have the following installed on your local machine:
- **Python 3.11+**
- **Node.js 20+**
- **Docker** and **Docker Compose**
- **Git**
- **Ollama** (Local installation from [ollama.com](https://ollama.com/))

## 1. Database Setup (PostgreSQL + pgvector)

We use a Dockerized PostgreSQL database with the `pgvector` extension pre-installed.

1. Navigate to the root directory of the project.
2. Start the database using Docker Compose:
   ```bash
   docker-compose up -d
   ```
3. The database will be available at `localhost:5432` with user `postgres` and password `postgres` (or whatever is defined in `.env`).

## 2. Environment Variables

Create a `.env` file in the root directory (or use the existing one if generated). Example configuration:

```env
# Database Settings
DB_NAME=reposage
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Ollama Settings
OLLAMA_BASE_URL=http://localhost:11434
GENERATION_MODEL=llama3.2
EMBEDDING_MODEL=all-minilm

# Cross-Encoder (Reranking) Settings
CROSS_ENCODER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2

# Django Settings
SECRET_KEY=your_development_secret_key
DEBUG=True
```

## 3. Ollama Configuration

Before running the backend, ensure your Ollama instance is running and you have pulled the required LLM model.

1. Start Ollama (usually runs as a background service on your OS).
2. Pull the specified generation model (e.g. `llama3.2`):
   ```bash
   ollama pull llama3.2
   ```

*Note: RepoSage uses `sentence-transformers` via HuggingFace locally for embeddings and cross-encoders, so you do not strictly need to pull an embedding model into Ollama unless you switch the embedding provider to Ollama.*

## 4. Backend Setup (Django)

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # On macOS/Linux
   python -m venv venv
   source venv/bin/activate

   # On Windows
   python -m venv venv
   venv\Scripts\activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run database migrations to set up your pgvector tables:
   ```bash
   python manage.py migrate
   ```
5. Start the Django development server:
   ```bash
   python manage.py runserver
   ```
   The backend will be available at `http://localhost:8000`.

## 5. Frontend Setup (Next.js)

1. Open a new terminal window and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`. 
   
*Note: The Next.js app handles routing the `/api/*` paths to `http://localhost:8000/*` to avoid CORS issues via `next.config.mjs` rewrites.*

## 6. Maintenance Commands

**Making Database Schema Changes**
If you modify Django models in `backend/`, you must generate and apply migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

**Checking System Health**
Check that the Next.js dashboard stats load correctly at `http://localhost:3000/dashboard` to verify that both the frontend and backend are communicating properly with PostgreSQL.
