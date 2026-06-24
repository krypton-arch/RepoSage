'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  projects,
  ingestion,
  query,
  formatBytes,
  formatDuration,
  formatDate,
  formatMs,
  timeAgo,
  type Project,
  type ProjectStats,
  type ProjectSettings,
  type StalenessReport,
  type IngestionJob,
  type SourceDocument,
  type DocumentChunk,
  type QuerySession,
  type QueryResult,
  type RetrievalMode,
  type Visibility,
} from '@/lib/api';

/* ---- helpers ---- */

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'indexed' || s === 'completed' || s === 'processed') return 'badge badge-indexed';
  if (s === 'ingesting' || s === 'running') return 'badge badge-running';
  if (s === 'failed' || s === 'error') return 'badge badge-failed';
  if (s === 'pending' || s === 'queued') return 'badge badge-pending';
  return 'badge badge-created';
}

function chunkTypeBadgeClass(type: string): string {
  const t = type.toLowerCase();
  if (t === 'code' || t === 'function' || t === 'class') return 'badge badge-code';
  if (t === 'markdown' || t === 'heading') return 'badge badge-markdown';
  if (t === 'config' || t === 'yaml' || t === 'json') return 'badge badge-config';
  return 'badge badge-text';
}

function languageBadgeClass(lang: string): string {
  const l = lang.toLowerCase();
  if (['python', 'javascript', 'typescript', 'java', 'kotlin', 'go', 'rust', 'c', 'cpp'].includes(l))
    return 'badge badge-code';
  if (['markdown', 'md'].includes(l)) return 'badge badge-markdown';
  if (['json', 'yaml', 'toml', 'xml', 'ini'].includes(l)) return 'badge badge-config';
  return 'badge badge-text';
}

function confidenceBadgeClass(level: string): string {
  if (level === 'high') return 'badge badge-indexed';
  if (level === 'medium') return 'badge badge-pending';
  if (level === 'low') return 'badge badge-running';
  return 'badge badge-failed';
}

const ACCEPTED_EXTENSIONS: Record<string, string[]> = {
  'text/x-python': ['.py'],
  'text/javascript': ['.js', '.jsx'],
  'text/typescript': ['.ts', '.tsx'],
  'text/x-java-source': ['.java'],
  'text/x-kotlin': ['.kt'],
  'text/markdown': ['.md', '.mdx'],
  'text/plain': ['.txt', '.log', '.cfg', '.env'],
  'application/json': ['.json'],
  'application/x-yaml': ['.yaml', '.yml'],
  'application/zip': ['.zip'],
  'text/x-c': ['.c', '.h'],
  'text/x-c++': ['.cpp', '.hpp', '.cc'],
  'text/x-go': ['.go'],
  'text/x-rust': ['.rs'],
  'text/x-ruby': ['.rb'],
  'text/x-shellscript': ['.sh', '.bash'],
  'text/css': ['.css'],
  'text/html': ['.html', '.htm'],
  'text/xml': ['.xml'],
  'application/toml': ['.toml'],
};

type TabId = 'files' | 'query' | 'settings';

/* ---- Component ---- */

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  /* ---- State ---- */
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('files');

  // Upload state
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Expanded document row — shows chunks
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);

  // Ingestion trigger
  const [ingesting, setIngesting] = useState(false);

  // Query tab state
  const [queries, setQueries] = useState<QuerySession[]>([]);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<QueryResult | null>(null);
  const [queryDetailLoading, setQueryDetailLoading] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);

  // Settings tab state
  const [settingsForm, setSettingsForm] = useState<ProjectSettings>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);

  /* ---- Data fetching ---- */

  const fetchAll = useCallback(async () => {
    try {
      const [proj, st, jb, docs] = await Promise.all([
        projects.get(id),
        projects.stats(id),
        ingestion.listJobs(id),
        ingestion.listDocuments(id),
      ]);
      setProject(proj);
      setStats(st);
      setJobs(jb);
      setDocuments(docs);
      // Initialize settings form from project
      setSettingsForm({
        retrieval_mode: proj.retrieval_mode,
        retrieval_top_k: proj.retrieval_top_k,
        max_context_tokens: proj.max_context_tokens,
        visibility: proj.visibility,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ---- Load queries when Query tab is activated ---- */
  const fetchQueries = useCallback(async () => {
    setQueriesLoading(true);
    try {
      const q = await query.list(id);
      setQueries(q);
    } catch {
      setQueries([]);
    } finally {
      setQueriesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'query') {
      fetchQueries();
    }
  }, [activeTab, fetchQueries]);

  /* ---- Load query detail ---- */
  const loadQueryDetail = async (queryId: string) => {
    if (selectedQueryId === queryId) {
      setSelectedQueryId(null);
      setSelectedQuery(null);
      return;
    }
    setSelectedQueryId(queryId);
    setQueryDetailLoading(true);
    try {
      const q = await query.get(id, queryId);
      setSelectedQuery(q);
    } catch {
      setSelectedQuery(null);
    } finally {
      setQueryDetailLoading(false);
    }
  };

  /* ---- Ask a question ---- */
  const handleAskQuestion = async () => {
    if (!questionInput.trim() || askingQuestion) return;
    setAskingQuestion(true);
    try {
      const result = await query.ask(id, questionInput.trim());
      setSelectedQuery(result);
      setSelectedQueryId(result.id);
      setQuestionInput('');
      // Refresh query list
      fetchQueries();
    } catch {
      // Error handled via UI
    } finally {
      setAskingQuestion(false);
    }
  };

  /* ---- Expand doc → load chunks ---- */

  const toggleDocExpand = async (docId: string) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null);
      setChunks([]);
      return;
    }
    setExpandedDocId(docId);
    setChunksLoading(true);
    try {
      const c = await ingestion.listChunks(id, docId);
      setChunks(c);
    } catch {
      setChunks([]);
    } finally {
      setChunksLoading(false);
    }
  };

  /* ---- Dropzone ---- */

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setStagedFiles((prev) => [...prev, ...acceptedFiles]);
    setUploadStatus(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_EXTENSIONS,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* ---- Upload & ingest ---- */

  const handleUploadAndIndex = async () => {
    if (stagedFiles.length === 0) return;
    setUploading(true);
    setUploadStatus(null);
    try {
      const zipFiles = stagedFiles.filter((f) => f.name.endsWith('.zip'));
      const regularFiles = stagedFiles.filter((f) => !f.name.endsWith('.zip'));

      if (regularFiles.length > 0) {
        await ingestion.uploadFiles(id, regularFiles);
      }
      for (const zip of zipFiles) {
        await ingestion.uploadZip(id, zip);
      }

      setUploadStatus('Files uploaded. Starting ingestion…');
      await ingestion.triggerIngestion(id);
      setUploadStatus('Ingestion started successfully.');
      setStagedFiles([]);

      // Refresh data after a short delay
      setTimeout(() => fetchAll(), 1500);
    } catch (err) {
      setUploadStatus(
        `Error: ${err instanceof Error ? err.message : 'Upload failed'}`
      );
    } finally {
      setUploading(false);
    }
  };

  /* ---- Trigger ingestion (header btn) ---- */

  const handleTriggerIngestion = async () => {
    setIngesting(true);
    try {
      await ingestion.triggerIngestion(id);
      setTimeout(() => fetchAll(), 1500);
    } catch {
      // silently fail — the jobs table will reflect the state
    } finally {
      setIngesting(false);
    }
  };

  /* ---- Save settings ---- */

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsStatus(null);
    try {
      const updated = await projects.updateSettings(id, settingsForm);
      setProject(updated);
      setSettingsStatus('Settings saved successfully.');
    } catch (err) {
      setSettingsStatus(`Error: ${err instanceof Error ? err.message : 'Failed to save settings'}`);
    } finally {
      setSavingSettings(false);
    }
  };

  /* ---- Delete project ---- */

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    try {
      await projects.delete(id);
      router.push('/');
    } catch {
      alert('Failed to delete project.');
    }
  };

  /* ---- Loading / Error states ---- */

  if (loading) {
    return (
      <div className="flex flex-col gap-lg" style={{ padding: 'var(--space-xl)' }}>
        <div className="skeleton" style={{ height: 36, width: 280 }} />
        <div className="skeleton" style={{ height: 18, width: 420 }} />
        <div className="stats-grid mt-lg">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 96 }} />
          ))}
        </div>
        <div className="skeleton mt-xl" style={{ height: 200 }} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="empty-state">
        <span className="material-symbols-outlined empty-state-icon">error</span>
        <div className="empty-state-title">Project Not Found</div>
        <p className="empty-state-text">{error || 'The requested project could not be loaded.'}</p>
        <button className="btn btn-outline" onClick={() => router.push('/')}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'files', label: 'Files', icon: 'folder_open' },
    { id: 'query', label: 'Query', icon: 'chat' },
    { id: 'settings', label: 'Settings', icon: 'tune' },
  ];

  /* ---- Render ---- */
  return (
    <main className="app-main">
    <div className="flex flex-col gap-xl">
      {/* ======== 1. PROJECT HEADER ======== */}
      <div className="page-header">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-md">
            <h1 className="text-headline-lg">{project.name}</h1>
            <span className={statusBadgeClass(project.status)}>{project.status}</span>
            <span className="badge badge-config">{project.retrieval_mode}</span>
            <span className="badge badge-text">{project.visibility}</span>
          </div>
          {project.description && (
            <p className="text-body-md text-muted">{project.description}</p>
          )}
          <p className="text-body-sm text-muted">
            Source: {project.source_type} · Created {timeAgo(project.created_at)}
            {project.last_indexed_at && ` · Last indexed ${timeAgo(project.last_indexed_at)}`}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button
            className="btn btn-primary"
            onClick={handleTriggerIngestion}
            disabled={ingesting}
          >
            <span className="material-symbols-outlined">play_arrow</span>
            {ingesting ? 'Indexing…' : 'Index Repository'}
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            <span className="material-symbols-outlined">delete</span>
            Delete
          </button>
        </div>
      </div>

      {/* ======== 2. STATS GRID ======== */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Files Indexed</div>
          <div className="stat-card-value">{stats?.total_files ?? project.total_files}</div>
          <div className="stat-card-sub">source documents</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Chunks</div>
          <div className="stat-card-value">{stats?.total_chunks ?? project.total_chunks}</div>
          <div className="stat-card-sub">embedded vectors</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg Chunk Tokens</div>
          <div className="stat-card-value">{stats?.avg_chunk_tokens ?? '—'}</div>
          <div className="stat-card-sub">tokens per chunk</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Queries</div>
          <div className="stat-card-value">{stats?.total_queries ?? 0}</div>
          <div className="stat-card-sub">questions asked</div>
        </div>
      </div>

      {/* ======== 3. TAB NAVIGATION ======== */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======== TAB CONTENT ======== */}

      {/* -------- FILES TAB -------- */}
      {activeTab === 'files' && (
        <>
          {/* File Upload */}
          <section>
            <h2 className="section-title">Upload Files</h2>
            <div className="card">
              <div
                {...getRootProps()}
                className={`dropzone${isDragActive ? ' active' : ''}`}
              >
                <input {...getInputProps()} />
                <span className="material-symbols-outlined dropzone-icon">cloud_upload</span>
                <p className="dropzone-text">
                  {isDragActive
                    ? 'Drop files here…'
                    : 'Drag & drop source files here, or click to browse'}
                </p>
                <p className="dropzone-hint">
                  .py .js .ts .java .kt .md .txt .json .yaml .zip and more
                </p>
              </div>

              {stagedFiles.length > 0 && (
                <div className="flex flex-col gap-xs mt-lg">
                  <div className="flex items-center justify-between mb-sm">
                    <span className="text-label-caps">
                      {stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setStagedFiles([])}
                    >
                      Clear all
                    </button>
                  </div>

                  {stagedFiles.map((file, idx) => (
                    <div className="file-item" key={`${file.name}-${idx}`}>
                      <span className="material-symbols-outlined file-item-icon">
                        {file.name.endsWith('.zip') ? 'folder_zip' : 'description'}
                      </span>
                      <span className="file-item-name">{file.name}</span>
                      <span className="file-item-meta">{formatBytes(file.size)}</span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeFile(idx)}
                        title="Remove file"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-md mt-md">
                    <button
                      className="btn btn-primary"
                      onClick={handleUploadAndIndex}
                      disabled={uploading}
                    >
                      <span className="material-symbols-outlined">upload</span>
                      {uploading ? 'Uploading…' : 'Upload & Index'}
                    </button>
                    {uploadStatus && (
                      <span
                        className={`text-body-sm ${
                          uploadStatus.startsWith('Error') ? 'text-error' : 'text-secondary'
                        }`}
                      >
                        {uploadStatus}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {stagedFiles.length === 0 && uploadStatus && (
                <div className="mt-md">
                  <span
                    className={`text-body-sm ${
                      uploadStatus.startsWith('Error') ? 'text-error' : 'text-secondary'
                    }`}
                  >
                    {uploadStatus}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Ingestion History */}
          <section>
            <h2 className="section-title">Ingestion History</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {jobs.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline)' }}>
                    history
                  </span>
                  <p className="text-body-md text-muted mt-sm">No ingestion jobs yet</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Files</th>
                        <th>Chunks Created</th>
                        <th>Failures</th>
                        <th>Duration</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id}>
                          <td>
                            <span className={statusBadgeClass(job.status)}>{job.status}</span>
                          </td>
                          <td>
                            {job.processed_files}/{job.total_files}
                          </td>
                          <td>{job.total_chunks_created}</td>
                          <td>
                            {job.failed_files > 0 ? (
                              <span className="text-error">{job.failed_files}</span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td>{formatDuration(job.duration_seconds)}</td>
                          <td className="text-muted">
                            {job.started_at ? timeAgo(job.started_at) : formatDate(job.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Indexed Files Browser */}
          <section>
            <h2 className="section-title">
              Indexed Files
              {documents.length > 0 && (
                <span className="text-muted" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', marginLeft: 8 }}>
                  ({documents.length})
                </span>
              )}
            </h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {documents.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline)' }}>
                    folder_open
                  </span>
                  <p className="text-body-md text-muted mt-sm">No files indexed yet</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 24 }} />
                        <th>File Path</th>
                        <th>Language</th>
                        <th>Size</th>
                        <th>Chunks</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => {
                        const isExpanded = expandedDocId === doc.id;
                        return (
                          <DocRow
                            key={doc.id}
                            doc={doc}
                            isExpanded={isExpanded}
                            onToggle={() => toggleDocExpand(doc.id)}
                            chunks={isExpanded ? chunks : []}
                            chunksLoading={isExpanded && chunksLoading}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* -------- QUERY TAB -------- */}
      {activeTab === 'query' && (
        <>
          {/* Ask a Question */}
          <section>
            <h2 className="section-title">Ask a Question</h2>
            <div className="card">
              <div className="flex gap-md">
                <input
                  type="text"
                  className="input"
                  placeholder="Ask about your codebase…"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  disabled={askingQuestion}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAskQuestion}
                  disabled={askingQuestion || !questionInput.trim()}
                >
                  <span className="material-symbols-outlined">send</span>
                  {askingQuestion ? 'Thinking…' : 'Ask'}
                </button>
              </div>
            </div>
          </section>

          {/* Selected Query Detail */}
          {selectedQuery && (
            <section>
              <h2 className="section-title">
                <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>forum</span>
                {' '}Answer
              </h2>
              <div className="card">
                <div className="flex flex-col gap-md">
                  {/* Question */}
                  <div style={{ padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--surface-container)' }}>
                    <p className="text-label-caps text-muted" style={{ marginBottom: 4 }}>Question</p>
                    <p className="text-body-md">{selectedQuery.question}</p>
                  </div>

                  {/* Answer */}
                  <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
                    <p className="text-label-caps text-muted" style={{ marginBottom: 8 }}>Answer</p>
                    <div className="text-body-md" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {selectedQuery.answer || 'No answer generated.'}
                    </div>
                  </div>

                  {/* Trace & Metrics Panel */}
                  <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                      <div className="stat-card-label">Trace ID</div>
                      <div className="text-code-md" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                        {selectedQuery.trace_id?.slice(0, 8)}…
                      </div>
                    </div>
                    <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                      <div className="stat-card-label">Retrieval</div>
                      <div className="stat-card-value" style={{ fontSize: 18 }}>
                        {formatMs(selectedQuery.retrieval_time_ms)}
                      </div>
                    </div>
                    <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                      <div className="stat-card-label">Generation</div>
                      <div className="stat-card-value" style={{ fontSize: 18 }}>
                        {formatMs(selectedQuery.generation_time_ms)}
                      </div>
                    </div>
                    <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                      <div className="stat-card-label">Chunks</div>
                      <div className="stat-card-value" style={{ fontSize: 18 }}>
                        {selectedQuery.chunks_used}/{selectedQuery.chunks_retrieved}
                      </div>
                      <div className="stat-card-sub">used / retrieved</div>
                    </div>
                    <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                      <div className="stat-card-label">Confidence</div>
                      <div><span className={confidenceBadgeClass(selectedQuery.confidence_level)}>{selectedQuery.confidence_level}</span></div>
                    </div>
                    <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                      <div className="stat-card-label">Mode</div>
                      <div className="text-body-sm"><span className="badge badge-config">{selectedQuery.retrieval_mode}</span></div>
                    </div>
                    <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                      <div className="stat-card-label">Avg Similarity</div>
                      <div className="stat-card-value" style={{ fontSize: 18 }}>
                        {selectedQuery.avg_similarity_score !== null
                          ? selectedQuery.avg_similarity_score.toFixed(3)
                          : '—'}
                      </div>
                    </div>
                    <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                      <div className="stat-card-label">Context Tokens</div>
                      <div className="stat-card-value" style={{ fontSize: 18 }}>
                        {selectedQuery.context_token_estimate || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Retrieved Sources */}
                  {selectedQuery.retrieved_chunks && selectedQuery.retrieved_chunks.length > 0 && (
                    <div>
                      <p className="text-label-caps text-muted" style={{ marginBottom: 8 }}>
                        Retrieved Sources ({selectedQuery.retrieved_chunks.length})
                      </p>
                      <div className="flex flex-col gap-sm">
                        {selectedQuery.retrieved_chunks.map((rc, idx) => (
                          <div className="chunk-card" key={rc.id || rc.chunk || (rc as any).chunk_id || idx}>
                            <div className="flex items-center justify-between mb-sm">
                              <div className="flex items-center gap-sm">
                                <span className="text-label-caps text-muted">#{rc.rank}</span>
                                <span className={chunkTypeBadgeClass(rc.chunk_type)}>{rc.chunk_type}</span>
                                <span className="table-file-path text-body-sm">{rc.file_path}</span>
                              </div>
                              <div className="flex items-center gap-md">
                                <span className="text-body-sm text-muted">
                                  {rc.similarity_score.toFixed(3)}
                                </span>
                                {rc.used_in_answer && (
                                  <span className="badge badge-indexed">used</span>
                                )}
                              </div>
                            </div>
                            <pre
                              className="text-code-md"
                              style={{
                                color: 'var(--on-surface-variant)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: 100,
                                overflow: 'hidden',
                              }}
                            >
                              {rc.content.length > 200 ? rc.content.slice(0, 200) + '…' : rc.content}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Query History */}
          <section>
            <h2 className="section-title">Query History</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {queriesLoading ? (
                <div className="flex flex-col gap-sm" style={{ padding: 'var(--space-lg)' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 48 }} />
                  ))}
                </div>
              ) : queries.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline)' }}>
                    chat_bubble_outline
                  </span>
                  <p className="text-body-md text-muted mt-sm">No queries yet. Ask a question above!</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Question</th>
                        <th>Confidence</th>
                        <th>Mode</th>
                        <th>Retrieval</th>
                        <th>Generation</th>
                        <th>Chunks</th>
                        <th>Similarity</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queries.map((q) => (
                        <tr
                          key={q.id}
                          onClick={() => loadQueryDetail(q.id)}
                          style={{
                            cursor: 'pointer',
                            background: selectedQueryId === q.id ? 'var(--surface-container)' : undefined,
                          }}
                        >
                          <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.question}
                          </td>
                          <td><span className={confidenceBadgeClass(q.confidence_level)}>{q.confidence_level}</span></td>
                          <td><span className="badge badge-config">{q.retrieval_mode}</span></td>
                          <td>{formatMs(q.retrieval_time_ms)}</td>
                          <td>{formatMs(q.generation_time_ms)}</td>
                          <td>{q.chunks_used}/{q.chunks_retrieved}</td>
                          <td>{q.avg_similarity_score !== null ? q.avg_similarity_score.toFixed(3) : '—'}</td>
                          <td className="text-muted">{timeAgo(q.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* -------- SETTINGS TAB -------- */}
      {activeTab === 'settings' && (
        <section>
          <h2 className="section-title">Project Settings</h2>
          <div className="card">
            <div className="flex flex-col gap-lg">
              {/* Retrieval Mode */}
              <div className="flex flex-col gap-xs">
                <label className="text-label-caps">Retrieval Mode</label>
                <select
                  className="input"
                  value={settingsForm.retrieval_mode || 'vector'}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, retrieval_mode: e.target.value as RetrievalMode }))}
                >
                  <option value="vector">Vector (Semantic)</option>
                  <option value="hybrid">Hybrid (Semantic + Lexical)</option>
                  <option value="lexical">Lexical (Full-Text)</option>
                </select>
                <p className="text-body-sm text-muted">
                  Choose how retrieved chunks are searched. Hybrid combines vector similarity with full-text keyword matching using Reciprocal Rank Fusion.
                </p>
              </div>

              {/* Top K */}
              <div className="flex flex-col gap-xs">
                <label className="text-label-caps">Top K (Chunks to Retrieve)</label>
                <input
                  type="number"
                  className="input"
                  value={settingsForm.retrieval_top_k ?? 10}
                  min={1}
                  max={50}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, retrieval_top_k: parseInt(e.target.value) || 10 }))}
                />
                <p className="text-body-sm text-muted">
                  Number of source chunks retrieved for each query (1–50).
                </p>
              </div>

              {/* Max Context Tokens */}
              <div className="flex flex-col gap-xs">
                <label className="text-label-caps">Max Context Tokens</label>
                <input
                  type="number"
                  className="input"
                  value={settingsForm.max_context_tokens ?? 3000}
                  min={500}
                  max={16000}
                  step={500}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, max_context_tokens: parseInt(e.target.value) || 3000 }))}
                />
                <p className="text-body-sm text-muted">
                  Maximum token budget for context assembly in the LLM prompt (500–16,000).
                </p>
              </div>

              {/* Visibility */}
              <div className="flex flex-col gap-xs">
                <label className="text-label-caps">Visibility</label>
                <select
                  className="input"
                  value={settingsForm.visibility || 'private'}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, visibility: e.target.value as Visibility }))}
                >
                  <option value="private">Private</option>
                  <option value="shared">Shared</option>
                  <option value="public">Public</option>
                </select>
                <p className="text-body-sm text-muted">
                  Controls who can access this project and its search results.
                </p>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-md">
                <button
                  className="btn btn-primary"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                >
                  <span className="material-symbols-outlined">save</span>
                  {savingSettings ? 'Saving…' : 'Save Settings'}
                </button>
                {settingsStatus && (
                  <span
                    className={`text-body-sm ${
                      settingsStatus.startsWith('Error') ? 'text-error' : 'text-secondary'
                    }`}
                  >
                    {settingsStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
    </main>
  );
}

/* ---- Document Row with expandable chunks ---- */

function DocRow({
  doc,
  isExpanded,
  onToggle,
  chunks,
  chunksLoading,
}: {
  doc: SourceDocument;
  isExpanded: boolean;
  onToggle: () => void;
  chunks: DocumentChunk[];
  chunksLoading: boolean;
}) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              color: 'var(--on-surface-variant)',
              transition: 'transform var(--transition-fast)',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            chevron_right
          </span>
        </td>
        <td className="table-file-path">{doc.file_path}</td>
        <td>
          <span className={languageBadgeClass(doc.language)}>{doc.language}</span>
        </td>
        <td>{formatBytes(doc.file_size_bytes)}</td>
        <td>{doc.chunk_count}</td>
        <td>
          <span className={statusBadgeClass(doc.status)}>{doc.status}</span>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0, background: 'var(--surface-container-lowest)' }}>
            <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
              {chunksLoading ? (
                <div className="flex items-center gap-sm" style={{ padding: 'var(--space-md) 0' }}>
                  <div className="skeleton" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                  <span className="text-body-sm text-muted">Loading chunks…</span>
                </div>
              ) : chunks.length === 0 ? (
                <p className="text-body-sm text-muted" style={{ padding: 'var(--space-sm) 0' }}>
                  No chunks found for this document.
                </p>
              ) : (
                <div className="flex flex-col gap-sm">
                  {chunks.map((chunk) => (
                    <div className="chunk-card" key={chunk.id}>
                      <div className="flex items-center justify-between mb-sm">
                        <div className="flex items-center gap-sm">
                          <span className="text-label-caps text-muted">
                            #{chunk.chunk_index}
                          </span>
                          <span className={chunkTypeBadgeClass(chunk.chunk_type)}>
                            {chunk.chunk_type}
                          </span>
                          {chunk.heading_context && (
                            <span className="text-body-sm text-muted">
                              {chunk.heading_context}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-md">
                          {chunk.start_line !== null && chunk.end_line !== null && (
                            <span className="text-body-sm text-muted">
                              L{chunk.start_line}–{chunk.end_line}
                            </span>
                          )}
                          <span className="text-body-sm text-muted">
                            {chunk.token_count} tokens
                          </span>
                        </div>
                      </div>
                      <pre
                        className="text-code-md"
                        style={{
                          color: 'var(--on-surface-variant)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: 120,
                          overflow: 'hidden',
                        }}
                      >
                        {chunk.content.length > 150
                          ? chunk.content.slice(0, 150) + '…'
                          : chunk.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
