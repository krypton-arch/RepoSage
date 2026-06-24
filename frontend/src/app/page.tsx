'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import {
  dashboard,
  formatDuration,
  timeAgo,
  DashboardStats,
  IngestionJob,
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboard
      .stats()
      .then(setStats)
      .catch((err) => setError(err.message ?? 'Failed to load dashboard'))
      .finally(() => setLoading(false));
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
