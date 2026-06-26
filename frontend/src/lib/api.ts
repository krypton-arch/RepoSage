/* API client for RepoSage backend */

const API_BASE = 'http://localhost:8000/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(`API Error ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    let detail: unknown;
    try {
      detail = JSON.parse(text);
    } catch {
      detail = text;
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return null as T;
  return response.json();
}

/* ==== Projects ==== */

export type RetrievalMode = 'vector' | 'hybrid' | 'lexical';
export type Visibility = 'private' | 'shared' | 'public';
export type ProjectStatus = 'created' | 'ingesting' | 'indexed' | 'failed';

export interface Project {
  id: string;
  name: string;
  description: string;
  source_type: string;
  source_path: string;
  status: ProjectStatus;
  total_files: number;
  total_chunks: number;
  last_indexed_at: string | null;
  created_at: string;
  updated_at: string;
  // Retrieval settings
  retrieval_mode: RetrievalMode;
  retrieval_top_k: number;
  max_context_tokens: number;
  // Access control
  owner_id: string;
  visibility: Visibility;
}

export interface ProjectSettings {
  retrieval_mode?: RetrievalMode;
  retrieval_top_k?: number;
  max_context_tokens?: number;
  visibility?: Visibility;
}

export interface ProjectStats {
  total_files: number;
  total_chunks: number;
  chunks_by_type: Record<string, number>;
  chunks_by_language: Record<string, number>;
  total_queries: number;
  total_eval_cases: number;
  last_ingestion_job: IngestionJob | null;
  avg_chunk_tokens: number;
}

export interface StalenessReport {
  stale_documents: number;
  stale_chunks: number;
  total_documents?: number;
  total_chunks: number;
  current_versions: {
    parser_version: string;
    chunker_version: string;
    embedding_version: string;
    embedding_model: string;
  };
  stale_versions: unknown[];
}

export interface DashboardStats {
  total_projects: number;
  total_files: number;
  total_chunks: number;
  total_queries: number;
  failed_jobs: number;
  recent_jobs: IngestionJob[];
}

export const projects = {
  list: () => request<{ results: Project[] }>('/projects/'),
  get: (id: string) => request<Project>(`/projects/${id}/`),
  create: (data: { name: string; description?: string; source_type?: string }) =>
    request<Project>('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Project>) =>
    request<Project>(`/projects/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/projects/${id}/`, { method: 'DELETE' }),
  stats: (id: string) => request<ProjectStats>(`/projects/${id}/stats/`),
  updateSettings: (id: string, data: ProjectSettings) =>
    request<Project>(`/projects/${id}/settings/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  staleness: (id: string) => request<StalenessReport>(`/projects/${id}/staleness/`),
};

export const dashboard = {
  stats: () => request<DashboardStats>('/dashboard/'),
};

/* ==== Ingestion ==== */

export type IngestionJobStatus =
  | 'PENDING'
  | 'PARSING'
  | 'EMBEDDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL_SUCCESS';

export interface SourceDocument {
  id: string;
  project: string;
  file_path: string;
  file_name: string;
  file_type: string;
  language: string;
  file_size_bytes: number;
  content_hash: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document: string;
  chunk_index: number;
  content: string;
  heading_context: string;
  symbol_context: string;
  chunk_type: string;
  start_line: number | null;
  end_line: number | null;
  token_count: number;
  char_count: number;
  metadata: Record<string, unknown>;
  file_path: string;
  created_at: string;
}

export interface IngestionJob {
  id: string;
  project: string;
  project_name?: string;
  project_id?: string;
  status: string;
  total_files: number;
  processed_files: number;
  failed_files: number;
  total_chunks_created: number;
  error_log: string;
  duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const ingestion = {
  uploadFiles: (projectId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return request<{ message: string; files: unknown[] }>(
      `/ingestion/projects/${projectId}/upload/`,
      { method: 'POST', body: formData }
    );
  },

  uploadZip: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ message: string }>(
      `/ingestion/projects/${projectId}/upload-zip/`,
      { method: 'POST', body: formData }
    );
  },

  triggerIngestion: (projectId: string, options?: { resume?: boolean; job_id?: string }) =>
    request<IngestionJob>(`/ingestion/projects/${projectId}/ingest/`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  listJobs: (projectId: string) =>
    request<IngestionJob[]>(`/ingestion/projects/${projectId}/jobs/`),

  getJob: (projectId: string, jobId: string) =>
    request<IngestionJob>(`/ingestion/projects/${projectId}/jobs/${jobId}/`),

  listDocuments: (projectId: string) =>
    request<SourceDocument[]>(`/ingestion/projects/${projectId}/documents/`),

  listChunks: (projectId: string, docId: string) =>
    request<DocumentChunk[]>(`/ingestion/projects/${projectId}/documents/${docId}/chunks/`),
};

/* ==== Query ==== */

export interface RetrievedChunkLog {
  id: string;
  chunk: string;
  rank: number;
  similarity_score: number;
  used_in_answer: boolean;
  file_path: string;
  content: string;
  chunk_type: string;
  heading_context: string;
  symbol_context: string;
  created_at: string;
}

export interface QueryResult {
  id: string;
  project: string;
  question: string;
  answer: string;
  confidence_level: string;
  retrieval_time_ms: number;
  generation_time_ms: number;
  chunks_retrieved: number;
  chunks_used: number;
  retrieved_chunks: RetrievedChunkLog[];
  metadata: Record<string, unknown>;
  created_at: string;
  // Trace (observability)
  trace_id: string;
  // Retrieval config used
  retrieval_mode: RetrievalMode;
  top_k_requested: number;
  // Generation metadata
  generation_model: string;
  embedding_model: string;
  prompt_token_estimate: number;
  context_token_estimate: number;
  // Retrieval quality metrics
  avg_similarity_score: number | null;
  max_similarity_score: number | null;
  min_similarity_score: number | null;
  score_std_dev: number | null;
}

/** Lighter interface for query list views (no full chunk data) */
export interface QuerySession {
  id: string;
  project: string;
  question: string;
  confidence_level: string;
  retrieval_time_ms: number;
  generation_time_ms: number;
  chunks_retrieved: number;
  chunks_used: number;
  retrieval_mode: RetrievalMode;
  generation_model: string;
  avg_similarity_score: number | null;
  created_at: string;
}

/** Legacy interfaces kept for backwards compat */
export interface Citation {
  index: number;
  chunk_id: string;
  file_path: string;
  content_preview: string;
  similarity_score: number;
  chunk_type: string;
  heading_context: string;
  symbol_context: string;
}

export interface RetrievedChunk {
  chunk_id: string;
  content: string;
  file_path: string;
  file_name: string;
  chunk_index: number;
  chunk_type: string;
  heading_context: string;
  symbol_context: string;
  start_line: number | null;
  end_line: number | null;
  token_count: number;
  similarity_score: number;
  used_in_answer: boolean;
  rank: number;
  metadata: Record<string, unknown>;
}

export const query = {
  ask: (projectId: string, question: string, topK: number = 10) =>
    request<QueryResult>(`/query/projects/${projectId}/query/`, {
      method: 'POST',
      body: JSON.stringify({ question, top_k: topK }),
    }),
  list: (projectId: string) =>
    request<QuerySession[]>(`/query/projects/${projectId}/queries/`),
  get: (projectId: string, queryId: string) =>
    request<QueryResult>(`/query/projects/${projectId}/queries/${queryId}/`),
};

/* ==== Evaluation ==== */

export interface EvaluationCase {
  id: string;
  project: string;
  question: string;
  expected_answer_traits: string;
  expected_source_files: string[];
  notes: string;
  // Benchmark versioning
  benchmark_suite: string;
  benchmark_version: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface EvaluationRun {
  id: string;
  evaluation_case: string;
  question: string;
  generated_answer: string;
  retrieved_chunks: string[];
  expected_files_retrieved: boolean | null;
  retrieval_precision: number | null;
  groundedness_rating: string;
  usefulness_rating: string;
  reviewer_notes: string;
  status: string;
  duration_seconds: number | null;
  // Config snapshot
  run_config: Record<string, unknown>;
  // Split metrics
  retrieval_recall: number | null;
  retrieval_latency_ms: number | null;
  generation_latency_ms: number | null;
  context_tokens_used: number | null;
  // Comparison
  compared_to_run: string | null;
  created_at: string;
}

export interface EvaluationRunComparison {
  run_a: EvaluationRun;
  run_b: EvaluationRun;
  deltas: {
    retrieval_precision: number | null;
    retrieval_recall: number | null;
    retrieval_latency_ms: number | null;
    generation_latency_ms: number | null;
    context_tokens_used: number | null;
  };
}

export const evaluation = {
  listCases: async (projectId: string) => {
    const res = await request<{ results: EvaluationCase[] }>(`/evaluation/projects/${projectId}/evaluation/cases/`);
    return res.results;
  },
  createCase: (projectId: string, data: Partial<EvaluationCase>) =>
    request<EvaluationCase>(`/evaluation/projects/${projectId}/evaluation/cases/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteCase: (projectId: string, caseId: string) =>
    request<void>(`/evaluation/projects/${projectId}/evaluation/cases/${caseId}/`, {
      method: 'DELETE',
    }),
  runAll: (projectId: string, topK: number = 10) =>
    request<{ summary: Record<string, unknown>; results: unknown[] }>(
      `/evaluation/projects/${projectId}/evaluation/run/`,
      { method: 'POST', body: JSON.stringify({ top_k: topK }) }
    ),
  listRuns: (projectId: string, caseId: string) =>
    request<EvaluationRun[]>(`/evaluation/projects/${projectId}/evaluation/cases/${caseId}/runs/`),
  deleteRun: (projectId: string, caseId: string, runId: string) =>
    request<void>(`/evaluation/projects/${projectId}/evaluation/cases/${caseId}/runs/${runId}/`, {
      method: 'DELETE',
    }),
  compareRuns: (projectId: string, runAId: string, runBId: string) =>
    request<EvaluationRunComparison>(
      `/evaluation/projects/${projectId}/evaluation/compare/`,
      { params: { run_a: runAId, run_b: runBId } }
    ),
};

/* ==== System Settings ==== */

export interface SystemSettings {
  theme: string;
  telemetry_enabled: boolean;
  ollama_endpoint: string;
  max_concurrent_jobs: number;
  vector_retention_days: number;
}

export const system = {
  getSettings: () => request<SystemSettings>('/settings/'),
  updateSettings: (data: Partial<SystemSettings>) =>
    request<SystemSettings>('/settings/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

/* ==== Utilities ==== */

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMs(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
