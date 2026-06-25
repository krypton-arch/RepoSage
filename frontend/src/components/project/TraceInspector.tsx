'use client';

import { QueryResult, formatMs } from '@/lib/api';
import { confidenceBadgeClass, chunkTypeBadgeClass } from '@/lib/badges';

interface TraceInspectorProps {
  selectedQuery: QueryResult;
}

export default function TraceInspector({ selectedQuery }: TraceInspectorProps) {
  return (
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
                  <div className="chunk-card" key={rc.id || idx}>
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
  );
}
