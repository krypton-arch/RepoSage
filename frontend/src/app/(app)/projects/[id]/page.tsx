'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TraceInspector from '@/components/project/TraceInspector';
import SettingsPanel from '@/components/project/SettingsPanel';
import StalenessIndicator from '@/components/project/StalenessIndicator';
import EvalCaseRow from '@/components/project/EvalCaseRow';
import {
  projects,
  ingestion,
  query,
  evaluation,
  formatBytes,
  formatDuration,
  formatDate,
  formatMs,
  formatPercent,
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
  type EvaluationCase,
  type EvaluationRun,
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

type TabId = 'files' | 'query' | 'evaluation' | 'settings';

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

  // Staleness state
  const [staleness, setStaleness] = useState<StalenessReport | null>(null);
  const [stalenessLoading, setStalenessLoading] = useState(false);

  // Evaluation tab state
  const [evalCases, setEvalCases] = useState<EvaluationCase[]>([]);
  const [evalCasesLoading, setEvalCasesLoading] = useState(false);
  const [evalRuns, setEvalRuns] = useState<Record<string, EvaluationRun[]>>({});
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalStatus, setEvalStatus] = useState<string | null>(null);
  const [newCaseForm, setNewCaseForm] = useState({ question: '', expected_answer_traits: '' });
  const [creatingCase, setCreatingCase] = useState(false);

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

  /* ---- Poll running jobs ---- */
  const hasRunningJobs = jobs.some((j) => ['pending', 'running', 'ingesting'].includes(j.status.toLowerCase()));
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const checkJobs = async () => {
      try {
        const currentJobs = await ingestion.listJobs(id);
        setJobs(currentJobs);
        if (!currentJobs.some((j) => ['pending', 'running', 'ingesting'].includes(j.status.toLowerCase()))) {
          clearInterval(interval);
          // Refresh stats and documents when jobs finish
          projects.stats(id).then(setStats).catch(() => {});
          ingestion.listDocuments(id).then(setDocuments).catch(() => {});
        }
      } catch (err) {}
    };

    if (hasRunningJobs) {
      interval = setInterval(checkJobs, 2000);
    }
    return () => clearInterval(interval);
  }, [id, hasRunningJobs]);

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
    if (activeTab === 'evaluation') {
      fetchEvalCases();
    }
    if (activeTab === 'settings') {
      fetchStaleness();
    }
  }, [activeTab, fetchQueries]);

  /* ---- Load staleness ---- */
  const fetchStaleness = async () => {
    setStalenessLoading(true);
    try {
      const report = await projects.staleness(id);
      setStaleness(report);
    } catch {
      setStaleness(null);
    } finally {
      setStalenessLoading(false);
    }
  };

  /* ---- Evaluation helpers ---- */
  const fetchEvalCases = async () => {
    setEvalCasesLoading(true);
    try {
      const cases = await evaluation.listCases(id);
      setEvalCases(cases);
    } catch {
      setEvalCases([]);
    } finally {
      setEvalCasesLoading(false);
    }
  };

  const refreshEvalRuns = async (caseId: string) => {
    try {
      const runs = await evaluation.listRuns(id, caseId);
      setEvalRuns((prev) => ({ ...prev, [caseId]: runs }));
    } catch {
      setEvalRuns((prev) => ({ ...prev, [caseId]: [] }));
    }
  };

  const loadEvalRuns = async (caseId: string) => {
    if (expandedCaseId === caseId) {
      setExpandedCaseId(null);
      return;
    }
    setExpandedCaseId(caseId);
    await refreshEvalRuns(caseId);
  };

  const handleRunEvaluation = async () => {
    setEvalRunning(true);
    setEvalStatus(null);
    try {
      const result = await evaluation.runAll(id);
      setEvalStatus(`Evaluation complete — ${(result.results || []).length} test(s) executed.`);
      fetchEvalCases();
    } catch (err) {
      setEvalStatus(`Error: ${err instanceof Error ? err.message : 'Evaluation failed'}`);
    } finally {
      setEvalRunning(false);
    }
  };

  const handleCreateCase = async () => {
    if (!newCaseForm.question.trim()) return;
    setCreatingCase(true);
    try {
      await evaluation.createCase(id, {
        question: newCaseForm.question.trim(),
        expected_answer_traits: newCaseForm.expected_answer_traits.trim(),
      });
      setNewCaseForm({ question: '', expected_answer_traits: '' });
      fetchEvalCases();
    } catch (err) {
      alert(`Failed to create pipeline stage: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCreatingCase(false);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm('Are you sure you want to delete this test case?')) return;
    try {
      await evaluation.deleteCase(id, caseId);
      if (expandedCaseId === caseId) setExpandedCaseId(null);
      fetchEvalCases();
    } catch (err) {
      alert(`Failed to delete case: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteRun = async (caseId: string, runId: string) => {
    if (!confirm('Are you sure you want to delete this evaluation run?')) return;
    try {
      await evaluation.deleteRun(id, caseId, runId);
      await refreshEvalRuns(caseId);
    } catch (err) {
      alert(`Failed to delete run: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

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
    } catch (err) {
      alert(`Query failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  function TableSkeleton() {
    return (
      <div className="border-2 border-[var(--surface-container)] bg-[var(--surface-container-lowest)] mt-8 animate-pulse">
        <div className="p-4 border-b-2 border-[var(--surface-container)]">
          <div className="w-40 h-4 bg-[var(--surface-container)]"></div>
        </div>
        <div className="p-4 flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-8 bg-[var(--surface-dim)] border border-[var(--surface-container)]"></div>
          ))}
        </div>
      </div>
    );
  }

  function IngestionProgressBar({ processed, total }: { processed: number; total: number }) {
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
    return (
      <div className="w-full flex items-center gap-3 mt-1">
        <div className="flex-1 h-1.5 bg-[var(--surface-container-lowest)] border border-[var(--surface-container)] overflow-hidden">
          <div 
            style={{ width: `${percent}%` }} 
            className="h-full bg-[var(--secondary)] transition-all duration-300"
          />
        </div>
        <span className="font-code-sm text-[var(--on-surface-variant)] w-8 text-right">{percent}%</span>
      </div>
    );
  }

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
    { id: 'evaluation', label: 'Evaluation', icon: 'science' },
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
                            <div className="flex flex-col">
                              <span className="font-code-sm">{job.processed_files}/{job.total_files}</span>
                              {['pending', 'running', 'ingesting'].includes(job.status.toLowerCase()) && (
                                <IngestionProgressBar processed={job.processed_files} total={job.total_files} />
                              )}
                            </div>
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
      {/* -------- QUERY TAB (IDE/CHAT STYLE) -------- */}
      {activeTab === 'query' && (
        <div className="flex h-[70vh] min-h-[600px] border-2 border-[var(--surface-container)] bg-[var(--surface-container-lowest)] overflow-hidden rounded-none shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]">
          {/* Left Pane: Context Explorer (Sidebar) */}
          <div className="w-[320px] md:w-[400px] flex-shrink-0 border-r-2 border-[var(--surface-container)] bg-[var(--surface-dim)] flex flex-col relative">
            <div className="p-4 border-b-2 border-[var(--surface-container)] flex justify-between items-center bg-[var(--surface-container-lowest)]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--accent-indigo)] text-[18px]">account_tree</span>
                <h3 className="font-label-caps tracking-widest text-[var(--on-surface)]">CONTEXT_EXPLORER</h3>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {!selectedQuery ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-6">
                  <span className="material-symbols-outlined text-[48px] mb-4 text-[var(--on-surface-variant)]">find_in_page</span>
                  <p className="font-body-md text-[var(--on-surface-variant)]">No query selected.</p>
                  <p className="font-label-caps text-[10px] mt-2 text-[var(--accent-indigo)]">AWAITING_INPUT</p>
                </div>
              ) : selectedQuery.retrieved_chunks && selectedQuery.retrieved_chunks.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-[var(--accent-emerald)] animate-pulse rounded-none"></div>
                    <span className="font-label-caps text-[var(--accent-emerald)] text-[10px]">AST_NODES_LOADED</span>
                  </div>
                  {selectedQuery.retrieved_chunks.map((rc, idx) => (
                    <div key={rc.id || idx} className="border border-[var(--surface-container)] bg-[var(--surface-container-lowest)] rounded-none group hover:border-[var(--accent-indigo)] transition-colors">
                      <div className="p-2 border-b border-[var(--surface-container)] flex items-center justify-between bg-[var(--surface-dim)]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="material-symbols-outlined text-[14px] text-[var(--on-surface-variant)]">description</span>
                          <span className="font-code-sm text-[var(--on-surface)] truncate" title={rc.file_path}>{rc.file_path.split('/').pop()}</span>
                        </div>
                        <span className="font-label-caps text-[10px] text-[var(--accent-indigo)] bg-[var(--accent-indigo)]/10 px-1">{rc.chunk_type}</span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-label-caps text-[10px] text-[var(--on-surface-variant)]">SCORE: {rc.similarity_score.toFixed(3)}</span>
                          <span className="font-label-caps text-[10px] text-[var(--secondary)]">{rc.used_in_answer ? 'USED' : 'REF'}</span>
                        </div>
                        <pre className="font-code-md text-[11px] text-[var(--on-surface-variant)] overflow-x-auto custom-scrollbar leading-relaxed">
                          {rc.content.substring(0, 150)}{rc.content.length > 150 ? '...' : ''}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center opacity-50 p-6">
                  <p className="font-body-md text-[var(--on-surface-variant)]">No context chunks retrieved.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Chat Interface */}
          <div className="flex-1 flex flex-col bg-[var(--surface-container-lowest)] relative">
            {/* Chat History & Trace Inspector */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-10 flex flex-col gap-6">
              {/* Optional: CRT Overlay restricted to Chat */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-20 z-0"></div>
              
              {queriesLoading ? (
                <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto mt-4 relative z-10">
                  <div className="h-16 bg-[var(--surface-dim)] border border-[var(--surface-container)] animate-pulse"></div>
                  <div className="h-40 bg-[var(--surface-dim)] border border-[var(--surface-container)] animate-pulse"></div>
                </div>
              ) : queries.length === 0 ? (
                <div className="m-auto text-center relative z-10">
                  <span className="material-symbols-outlined text-[64px] text-[var(--surface-container-highest)] mb-4">terminal</span>
                  <h3 className="font-headline-md text-[var(--on-surface-strong)]">SYSTEM_READY</h3>
                  <p className="font-body-md text-[var(--on-surface-variant)] mt-2">Initialize query sequence below.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto relative z-10">
                  {/* We show the selected query as the primary "Chat Bubble" */}
                  {selectedQuery ? (
                    <div className="flex flex-col gap-4">
                      {/* User Bubble */}
                      <div className="self-end max-w-[80%] bg-[var(--surface-dim)] border border-[var(--surface-container-highest)] p-4 border-r-4 border-r-[var(--accent-indigo)]">
                        <p className="font-label-caps text-[10px] text-[var(--on-surface-variant)] mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[12px]">person</span> USER_INPUT
                        </p>
                        <p className="font-body-lg text-[var(--on-surface-strong)]">{selectedQuery.question}</p>
                      </div>

                      {/* Engine Bubble */}
                      <div className="self-start w-full max-w-[95%] bg-[var(--surface-container-lowest)] border-2 border-[var(--surface-container)] p-6 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] relative">
                        <p className="font-label-caps text-[10px] text-[var(--accent-emerald)] mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[12px] animate-pulse">memory</span> REPOSAGE_ENGINE
                        </p>
                        <div className="font-body-md text-[var(--on-surface)] leading-relaxed prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[var(--surface-dim)] prose-pre:border prose-pre:border-[var(--surface-container)] prose-code:text-[var(--secondary)] prose-a:text-[var(--accent-indigo)] prose-headings:text-[var(--on-surface-strong)] prose-strong:text-[var(--accent-emerald)]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {selectedQuery.answer || 'No answer generated.'}
                          </ReactMarkdown>
                        </div>
                        
                        {/* Inline Trace Stats */}
                        <div className="mt-6 pt-4 border-t border-[var(--surface-container)] flex flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-label-caps text-[10px] text-[var(--on-surface-variant)]">CONFIDENCE:</span>
                            <span className={confidenceBadgeClass(selectedQuery.confidence_level)}>{selectedQuery.confidence_level}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-label-caps text-[10px] text-[var(--on-surface-variant)]">LATENCY:</span>
                            <span className="font-code-sm text-[var(--secondary)]">{formatMs(selectedQuery.retrieval_time_ms + selectedQuery.generation_time_ms)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-label-caps text-[10px] text-[var(--on-surface-variant)]">TOKENS:</span>
                            <span className="font-code-sm text-[var(--on-surface-variant)]">{selectedQuery.context_token_estimate || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="m-auto text-center">
                      <p className="font-label-caps text-[var(--on-surface-variant)]">SELECT A QUERY FROM HISTORY</p>
                    </div>
                  )}

                  {/* Minified History List */}
                  {queries.length > 1 && (
                    <div className="mt-8 pt-8 border-t border-[var(--surface-container)]">
                      <h4 className="font-label-caps text-[var(--accent-indigo)] mb-4">PREVIOUS_SESSIONS</h4>
                      <div className="flex flex-col gap-2">
                        {queries.filter(q => q.id !== selectedQuery?.id).map((q) => (
                          <div 
                            key={q.id}
                            onClick={() => loadQueryDetail(q.id)}
                            className="p-3 border border-[var(--surface-container)] bg-[var(--surface-dim)] hover:border-[var(--surface-container-highest)] cursor-pointer flex justify-between items-center group transition-colors"
                          >
                            <span className="font-body-sm text-[var(--on-surface-variant)] group-hover:text-[var(--on-surface-strong)] truncate max-w-[70%]">{q.question}</span>
                            <span className="font-code-md text-[10px] text-[var(--surface-container-highest)]">{timeAgo(q.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t-2 border-[var(--surface-container)] bg-[var(--surface-dim)] relative z-20">
              <div className="flex gap-4 items-center max-w-4xl mx-auto relative">
                <input
                  type="text"
                  className="flex-1 bg-[var(--surface-container-lowest)] border-2 border-[var(--surface-container-highest)] text-[var(--on-surface-strong)] font-body-md px-4 py-3 outline-none focus:border-[var(--accent-indigo)] transition-colors placeholder-[var(--outline)]"
                  placeholder="Query codebase (e.g. 'How does the auth middleware handle JWT?')"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  disabled={askingQuestion}
                />
                <button
                  className="bg-[var(--accent-indigo)] text-white font-label-caps tracking-widest px-6 py-3 border-2 border-[var(--accent-indigo)] hover:bg-transparent hover:text-[var(--accent-indigo)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] active:translate-y-1 active:translate-x-1 active:shadow-none"
                  onClick={handleAskQuestion}
                  disabled={askingQuestion || !questionInput.trim()}
                >
                  {askingQuestion ? (
                    <>
                      <div className="w-2 h-2 bg-white animate-ping"></div>
                      PROCESSING
                    </>
                  ) : (
                    <>
                      EXECUTE
                      <span className="material-symbols-outlined text-[18px]">keyboard_return</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------- EVALUATION TAB (CI/CD STYLE) -------- */}
      {activeTab === 'evaluation' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-[350px_1fr] gap-8 max-w-full mx-auto w-full items-start"
        >
          {/* Create Test Case */}
          <section className="border-2 border-[var(--surface-container)] bg-[var(--surface-dim)] shadow-[6px_6px_0px_0px_rgba(30,41,59,1)] sticky top-8">
            <div className="p-4 border-b-2 border-[var(--surface-container)] bg-[var(--surface-container-lowest)] flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--secondary)]">build_circle</span>
              <h2 className="font-label-caps tracking-widest text-[var(--on-surface-strong)] text-sm">DEFINE_PIPELINE</h2>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[var(--on-surface-variant)] text-[10px]">TEST_QUERY_INPUT</label>
                <input
                  type="text"
                  className="bg-[var(--surface-container-lowest)] border-2 border-[var(--surface-container)] text-[var(--on-surface-strong)] font-body-md px-4 py-3 outline-none focus:border-[var(--secondary)] transition-colors placeholder-[var(--outline)]"
                  placeholder="e.g. What does the authentication middleware do?"
                  value={newCaseForm.question}
                  onChange={(e) => setNewCaseForm((prev) => ({ ...prev, question: e.target.value }))}
                  disabled={creatingCase}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[var(--on-surface-variant)] text-[10px]">EXPECTED_ASSERTIONS</label>
                <textarea
                  className="bg-[var(--surface-container-lowest)] border-2 border-[var(--surface-container)] text-[var(--secondary)] font-code-md px-4 py-3 outline-none focus:border-[var(--secondary)] transition-colors placeholder-[var(--outline)] custom-scrollbar"
                  placeholder="e.g. MUST_INCLUDE(JWT validation) && MUST_MENTION(role-based access control)"
                  value={newCaseForm.expected_answer_traits}
                  onChange={(e) => setNewCaseForm((prev) => ({ ...prev, expected_answer_traits: e.target.value }))}
                  disabled={creatingCase}
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-[var(--surface-container)] text-[var(--on-surface)] font-label-caps tracking-widest px-6 py-3 border-2 border-[var(--surface-container-highest)] hover:bg-[var(--secondary)] hover:text-black hover:border-[var(--secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start flex items-center gap-2"
                onClick={handleCreateCase}
                disabled={creatingCase || !newCaseForm.question.trim()}
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                {creatingCase ? 'COMMITTING...' : 'COMMIT_STAGE'}
              </motion.button>
            </div>
          </section>

          {/* Run All Evaluations */}
          <section className="border-2 border-[var(--surface-container)] bg-[var(--surface-container-lowest)] shadow-[6px_6px_0px_0px_rgba(30,41,59,1)]">
            <div className="p-4 border-b-2 border-[var(--surface-container)] bg-[var(--surface-dim)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--accent-emerald)]">science</span>
                <h2 className="font-label-caps tracking-widest text-[var(--on-surface-strong)]">EVALUATION_SUITE</h2>
                <span className="font-code-sm text-[var(--on-surface-variant)] ml-2 px-2 py-0.5 border border-[var(--surface-container-highest)] bg-[var(--surface-container-lowest)]">
                  {evalCases.length} TESTS
                </span>
              </div>
              <div className="flex items-center gap-4">
                {evalStatus && (
                  <span className={`font-code-sm ${evalStatus.startsWith('Error') ? 'text-[var(--error)]' : 'text-[var(--accent-emerald)]'}`}>
                    [{evalStatus}]
                  </span>
                )}
                <motion.button
                  whileHover={{ scale: evalRunning || evalCases.length === 0 ? 1 : 1.02, boxShadow: "0px 0px 15px rgba(16,185,129,0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-[var(--accent-emerald)] text-black font-label-caps font-bold tracking-widest px-6 py-2 border-2 border-[var(--accent-emerald)] hover:bg-transparent hover:text-[var(--accent-emerald)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 relative overflow-hidden"
                  onClick={handleRunEvaluation}
                  disabled={evalRunning || evalCases.length === 0}
                >
                  {evalRunning ? (
                    <>
                      <div className="w-2 h-2 bg-black animate-pulse"></div>
                      EXECUTING...
                      <div className="absolute inset-0 bg-white/20 animate-pulse mix-blend-overlay"></div>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                      RUN_SUITE
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            <div className="overflow-hidden">
              {evalCasesLoading ? (
                <div className="flex flex-col gap-4 p-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-[var(--surface-dim)] border border-[var(--surface-container)] animate-pulse"></div>
                  ))}
                </div>
              ) : evalCases.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center opacity-50 border-t border-dashed border-[var(--surface-container)]">
                  <span className="material-symbols-outlined text-[48px] text-[var(--on-surface-variant)] mb-4">flaky</span>
                  <p className="font-code-md text-[var(--on-surface-variant)]">NO_TESTS_DEFINED</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--surface-dim)] border-b border-[var(--surface-container)]">
                      <tr>
                        <th className="py-3 px-4 w-10 border-r border-[var(--surface-container)]"></th>
                        <th className="font-label-caps text-[var(--on-surface-variant)] py-3 px-4 border-r border-[var(--surface-container)]">QUERY_TARGET</th>
                        <th className="font-label-caps text-[var(--on-surface-variant)] py-3 px-4 border-r border-[var(--surface-container)]">ASSERTIONS</th>
                        <th className="font-label-caps text-[var(--on-surface-variant)] py-3 px-4 border-r border-[var(--surface-container)]">TAGS</th>
                        <th className="font-label-caps text-[var(--on-surface-variant)] py-3 px-4 border-r border-[var(--surface-container)]">TIMESTAMP</th>
                        <th className="py-3 px-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="font-body-sm text-[var(--on-surface)]">
                      <AnimatePresence mode="popLayout">
                        {evalCases.map((ec, index) => {
                          const isExp = expandedCaseId === ec.id;
                          const runs = evalRuns[ec.id] || [];
                          return (
                            <EvalCaseRow
                              key={ec.id}
                              evalCase={ec}
                              isExpanded={isExp}
                              onToggle={() => loadEvalRuns(ec.id)}
                              runs={runs}
                              index={index}
                              onDeleteCase={handleDeleteCase}
                              onDeleteRun={handleDeleteRun}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </motion.div>
      )}

      {/* -------- SETTINGS TAB -------- */}
      {activeTab === 'settings' && (
        <>
          {/* Index Staleness Section */}
          <StalenessIndicator staleness={staleness} loading={stalenessLoading} />

          {/* Retrieval Settings Section */}
          <SettingsPanel
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            onSave={handleSaveSettings}
            saving={savingSettings}
            status={settingsStatus}
          />
        </>
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


