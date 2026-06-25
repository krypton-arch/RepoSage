'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import {
  dashboard,
  projects,
  formatDuration,
  timeAgo,
  DashboardStats,
  IngestionJob,
  Project,
  StalenessReport,
} from '@/lib/api';

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'completed') return 'badge badge-completed';
  if (s === 'running' || s === 'ingesting') return 'badge badge-running';
  if (s === 'failed') return 'badge badge-failed';
  if (s === 'pending') return 'badge badge-pending';
  return 'badge badge-created';
}

function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="skeleton" style={{ width: 80, height: 12, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 100, height: 32, marginBottom: 6 }} />
      <div className="skeleton" style={{ width: 60, height: 12 }} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="card mt-xl">
      <div className="skeleton" style={{ width: 160, height: 14, marginBottom: 16 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width: '100%', height: 20, marginBottom: 12, borderRadius: 4 }}
        />
      ))}
    </div>
  );
}

/* ---- Staleness Indicator Bar ---- */
function StalenessBar({ ratio }: { ratio: number }) {
  const percent = Math.round(ratio * 100);
  const color =
    percent === 0
      ? 'var(--accent-emerald)'
      : percent < 25
        ? 'var(--tertiary)'
        : 'var(--error)';

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--surface-container-highest)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(percent, 2)}%`,
            height: '100%',
            borderRadius: 3,
            background: color,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span className="text-body-sm text-muted" style={{ marginTop: 2, display: 'inline-block' }}>
        {percent}% stale
      </span>
    </div>
  );
}

interface ProjectStaleness {
  project: Project;
  report: StalenessReport;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Staleness state
  const [stalenessData, setStalenessData] = useState<ProjectStaleness[]>([]);
  const [stalenessLoading, setStalenessLoading] = useState(true);

  useEffect(() => {
    dashboard
      .stats()
      .then(setStats)
      .catch((err) => setError(err.message ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch staleness for all projects
  useEffect(() => {
    setStalenessLoading(true);
    projects
      .list()
      .then(async (data) => {
        const results: ProjectStaleness[] = [];
        for (const proj of data.results) {
          try {
            const report = await projects.staleness(proj.id);
            results.push({ project: proj, report });
          } catch {
            // Skip projects that fail staleness check
          }
        }
        setStalenessData(results);
      })
      .catch(() => setStalenessData([]))
      .finally(() => setStalenessLoading(false));
  }, []);

  const statCards = stats
    ? [
        {
          label: 'Total Projects',
          value: stats.total_projects,
          icon: 'folder_open',
          sub: null,
        },
        {
          label: 'Total Files',
          value: stats.total_files,
          icon: 'description',
          sub: null,
        },
        {
          label: 'Total Chunks',
          value: stats.total_chunks,
          icon: 'data_object',
          sub: null,
        },
        {
          label: 'Total Queries',
          value: stats.total_queries,
          icon: 'search',
          sub: null,
        },
      ]
    : [];

  const staleProjects = stalenessData.filter((d) => d.report.staleness_ratio > 0);
  const healthyProjects = stalenessData.filter((d) => d.report.staleness_ratio === 0);

  return (
    <>
      <Header title="Dashboard" />

      <main className="app-main">
        {error && (
          <div className="card" style={{ borderColor: 'var(--error)', marginBottom: 'var(--space-xl)' }}>
            <p className="text-error text-body-md">
              <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6 }}>
                error
              </span>
              {error}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((card) => (
                <div className="stat-card" key={card.label}>
                  <div className="flex items-center justify-between mb-sm">
                    <span className="stat-card-label">{card.label}</span>
                    <span
                      className="material-symbols-outlined text-muted"
                      style={{ fontSize: 20 }}
                    >
                      {card.icon}
                    </span>
                  </div>
                  <div className="stat-card-value">
                    {card.value.toLocaleString()}
                  </div>
                </div>
              ))}
        </div>

        {/* ======== Staleness Overview ======== */}
        <div className="card mt-xl">
          <div className="card-header">
            <h2 className="text-headline-md">
              <span className="material-symbols-outlined" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 6 }}>
                update
              </span>
              Index Health
            </h2>
            {staleProjects.length > 0 && (
              <span className="badge badge-pending">
                {staleProjects.length} need{staleProjects.length === 1 ? 's' : ''} re-indexing
              </span>
            )}
            {!stalenessLoading && staleProjects.length === 0 && stalenessData.length > 0 && (
              <span className="badge badge-indexed">All indexes up to date</span>
            )}
          </div>

          {stalenessLoading ? (
            <div className="flex flex-col gap-md" style={{ padding: 'var(--space-md) 0' }}>
              {[1, 2].map((i) => (
                <div key={i} className="skeleton" style={{ height: 64 }} />
              ))}
            </div>
          ) : stalenessData.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--outline)' }}>
                inventory_2
              </span>
              <p className="text-body-md text-muted mt-sm">No projects to monitor yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-md" style={{ padding: 'var(--space-sm) 0' }}>
              {/* Stale projects first, then healthy */}
              {[...staleProjects, ...healthyProjects].map(({ project: proj, report }) => (
                <div
                  key={proj.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 'var(--space-md)',
                    alignItems: 'center',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    background: report.staleness_ratio > 0
                      ? 'rgba(255, 183, 131, 0.05)'
                      : 'var(--surface-container-lowest)',
                    border: report.staleness_ratio > 0
                      ? '1px solid rgba(255, 183, 131, 0.15)'
                      : '1px solid var(--outline-variant)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)',
                  }}
                  onClick={() => router.push(`/projects/${proj.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-container)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = report.staleness_ratio > 0
                      ? 'rgba(255, 183, 131, 0.05)'
                      : 'var(--surface-container-lowest)')
                  }
                >
                  <div>
                    <div className="flex items-center gap-sm mb-xs">
                      <span className="text-body-md" style={{ fontWeight: 600 }}>{proj.name}</span>
                      {report.staleness_ratio > 0 ? (
                        <span className="badge badge-pending">
                          {report.stale_chunks}/{report.total_chunks} chunks stale
                        </span>
                      ) : (
                        <span className="badge badge-indexed">healthy</span>
                      )}
                    </div>
                    <StalenessBar ratio={report.staleness_ratio} />
                  </div>
                  <div className="flex flex-col gap-xs" style={{ textAlign: 'right', minWidth: 120 }}>
                    <span className="text-body-sm text-muted">
                      Parser {report.current_parser_version}
                    </span>
                    <span className="text-body-sm text-muted">
                      Chunker {report.current_chunker_version}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Ingestion Jobs */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="card mt-xl">
            <div className="card-header">
              <h2 className="text-headline-md">Recent Ingestion Jobs</h2>
              {stats && stats.failed_jobs > 0 && (
                <span className="badge badge-failed">
                  {stats.failed_jobs} failed
                </span>
              )}
            </div>

            {stats && stats.recent_jobs.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Files</th>
                      <th>Chunks</th>
                      <th>Duration</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_jobs.map((job: IngestionJob) => (
                      <tr key={job.id}>
                        <td className="text-body-md">
                          {job.project_name ?? job.project}
                        </td>
                        <td>
                          <span className={statusBadgeClass(job.status)}>
                            {job.status}
                          </span>
                        </td>
                        <td className="text-body-sm text-muted">
                          {job.processed_files}/{job.total_files}
                        </td>
                        <td className="text-body-sm text-muted">
                          {job.total_chunks_created.toLocaleString()}
                        </td>
                        <td className="text-body-sm text-muted">
                          {formatDuration(job.duration_seconds)}
                        </td>
                        <td className="text-body-sm text-muted">
                          {timeAgo(job.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <span className="material-symbols-outlined empty-state-icon">
                  hourglass_empty
                </span>
                <p className="empty-state-title">No ingestion jobs yet</p>
                <p className="empty-state-text text-body-sm">
                  Create a project and ingest files to see job history here.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
