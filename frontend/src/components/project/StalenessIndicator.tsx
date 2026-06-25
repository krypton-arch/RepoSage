'use client';

import { StalenessReport } from '@/lib/api';

interface StalenessIndicatorProps {
  staleness: StalenessReport | null;
  loading: boolean;
}

export default function StalenessIndicator({ staleness, loading }: StalenessIndicatorProps) {
  return (
    <section>
      <h2 className="section-title">
        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>update</span>
        Index Health
      </h2>
      <div className="card">
        {loading ? (
          <div className="flex flex-col gap-sm">
            <div className="skeleton" style={{ height: 20, width: '60%' }} />
            <div className="skeleton" style={{ height: 14, width: '40%' }} />
          </div>
        ) : staleness ? (
          <div className="flex flex-col gap-md">
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div className="stat-card-label">Stale Chunks</div>
                <div className="stat-card-value" style={{ fontSize: 20, color: staleness.stale_chunks > 0 ? 'var(--tertiary)' : 'var(--accent-emerald)' }}>
                  {staleness.stale_chunks}/{staleness.total_chunks}
                </div>
              </div>
              <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div className="stat-card-label">Stale Documents</div>
                <div className="stat-card-value" style={{ fontSize: 20, color: staleness.stale_documents > 0 ? 'var(--tertiary)' : 'var(--accent-emerald)' }}>
                  {staleness.stale_documents}{staleness.total_documents !== undefined ? `/${staleness.total_documents}` : ''}
                </div>
              </div>
              <div className="stat-card" style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                <div className="stat-card-label">Staleness</div>
                <div className="stat-card-value" style={{ fontSize: 20, color: (staleness.total_chunks > 0 && staleness.stale_chunks > 0) ? 'var(--tertiary)' : 'var(--accent-emerald)' }}>
                  {Math.round((staleness.total_chunks > 0 ? staleness.stale_chunks / staleness.total_chunks : 0) * 100)}%
                </div>
              </div>
            </div>
            <div className="flex gap-lg" style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 'var(--space-md)' }}>
              <span className="text-body-sm text-muted">Parser: <strong>{staleness.current_versions.parser_version}</strong></span>
              <span className="text-body-sm text-muted">Chunker: <strong>{staleness.current_versions.chunker_version}</strong></span>
              <span className="text-body-sm text-muted">Embedding: <strong>{staleness.current_versions.embedding_model}</strong></span>
            </div>
            {(staleness.total_chunks > 0 && staleness.stale_chunks > 0) && (
              <div style={{ padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', background: 'rgba(255, 183, 131, 0.08)', border: '1px solid rgba(255, 183, 131, 0.2)' }}>
                <p className="text-body-sm" style={{ color: 'var(--tertiary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>warning</span>
                  Some chunks were created with older pipeline versions. Re-index to update them.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-body-sm text-muted">Unable to load staleness data.</p>
        )}
      </div>
    </section>
  );
}
