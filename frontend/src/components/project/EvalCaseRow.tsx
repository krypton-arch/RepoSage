'use client';

import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EvaluationCase, EvaluationRun, formatMs, formatPercent, formatDuration, timeAgo } from '@/lib/api';

interface EvalCaseRowProps {
  evalCase: EvaluationCase;
  isExpanded: boolean;
  onToggle: () => void;
  runs: EvaluationRun[];
  index: number;
  onDeleteCase: (caseId: string) => void;
  onDeleteRun: (caseId: string, runId: string) => void;
}

export default function EvalCaseRow({
  evalCase,
  isExpanded,
  onToggle,
  runs,
  index,
  onDeleteCase,
  onDeleteRun,
}: EvalCaseRowProps) {
  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
        onClick={onToggle}
        className="group hover:bg-[var(--surface-container)]/30 transition-colors"
        style={{ cursor: 'pointer', background: isExpanded ? 'rgba(30,41,59,0.5)' : undefined }}
      >
        <td className="px-4 py-4 border-r border-[var(--surface-container)]">
          <motion.span
            className="material-symbols-outlined text-[var(--on-surface-variant)]"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 20 }}
          >
            chevron_right
          </motion.span>
        </td>
        <td className="px-4 py-4 text-[var(--on-surface-strong)] font-body-md border-r border-[var(--surface-container)]" style={{ maxWidth: '400px' }}>
          <div className="line-clamp-2 leading-relaxed">{evalCase.question}</div>
        </td>
        <td className="px-4 py-4 text-[var(--secondary)] font-code-sm border-r border-[var(--surface-container)]" style={{ maxWidth: '300px' }}>
          <div className="line-clamp-2 leading-relaxed">{evalCase.expected_answer_traits || '—'}</div>
        </td>
        <td className="px-4 py-4 border-r border-[var(--surface-container)]">
          {evalCase.tags && evalCase.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {evalCase.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 text-[10px] font-label-caps tracking-wider border border-[var(--surface-container-highest)] text-[var(--on-surface-variant)] rounded-sm">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[#64748b]">—</span>
          )}
        </td>
        <td className="px-4 py-4 text-[#64748b] font-code-sm border-r border-[var(--surface-container)]">{timeAgo(evalCase.created_at)}</td>
        <td className="px-4 py-4 text-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteCase(evalCase.id); }}
            className="text-[var(--on-surface-variant)] hover:text-[var(--error)] transition-colors flex items-center justify-center p-1 mx-auto"
            title="Delete Test Case"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </td>
      </motion.tr>
      
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={6} className="p-0 border-b-2 border-t-2 border-[var(--surface-container)] bg-[var(--surface-container-lowest)]">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-8">
                  {runs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--surface-container)] text-[#64748b]">
                      <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">history_toggle_off</span>
                      <p className="font-code-md">No evaluation runs yet. Click &quot;RUN_SUITE&quot; to begin.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {runs.map((run) => (
                        <div
                          key={run.id}
                          className="border border-[var(--surface-container)] bg-[var(--surface-dim)] p-6 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]"
                        >
                          <div className="flex items-center justify-between mb-4 border-b border-[var(--surface-container)] pb-4">
                            <div className="flex items-center gap-4">
                              <span className={`px-3 py-1 font-label-caps tracking-widest text-[11px] border ${
                                run.status === 'completed' ? 'border-[var(--accent-emerald)] text-[var(--accent-emerald)] bg-[var(--accent-emerald)]/10' :
                                run.status === 'failed' ? 'border-[var(--error)] text-[var(--error)] bg-[var(--error)]/10' :
                                'border-[var(--tertiary)] text-[var(--tertiary)] bg-[var(--tertiary)]/10'
                              }`}>
                                {run.status}
                              </span>
                              <span className="font-code-sm text-[#64748b]">{timeAgo(run.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              {run.retrieval_precision !== null && (
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[var(--secondary)] text-[16px]">target</span>
                                  <span className="font-code-md text-[var(--on-surface-strong)]">
                                    Precision: <span className="text-[var(--secondary)]">{formatPercent(run.retrieval_precision)}</span>
                                  </span>
                                </div>
                              )}
                              {run.retrieval_latency_ms !== null && (
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[var(--on-surface-variant)] text-[16px]">timer</span>
                                  <span className="font-code-sm text-[var(--on-surface-variant)]">
                                    {formatMs(run.retrieval_latency_ms)}
                                  </span>
                                </div>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteRun(evalCase.id, run.id); }}
                                className="text-[#64748b] hover:text-[var(--error)] transition-colors flex items-center justify-center p-1 ml-2"
                                title="Delete Run"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-[var(--surface-container-lowest)] border border-[var(--surface-container)] p-3">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-1">GROUNDEDNESS</div>
                              <div className="font-code-lg text-[var(--on-surface-strong)]">{run.groundedness_rating || '—'}</div>
                            </div>
                            <div className="bg-[var(--surface-container-lowest)] border border-[var(--surface-container)] p-3">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-1">USEFULNESS</div>
                              <div className="font-code-lg text-[var(--on-surface-strong)]">{run.usefulness_rating || '—'}</div>
                            </div>
                            <div className="bg-[var(--surface-container-lowest)] border border-[var(--surface-container)] p-3">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-1">CONTEXT TOKENS</div>
                              <div className="font-code-lg text-[var(--secondary)]">{run.context_tokens_used ?? '—'}</div>
                            </div>
                            <div className="bg-[var(--surface-container-lowest)] border border-[var(--surface-container)] p-3">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-1">GENERATION TIME</div>
                              <div className="font-code-lg text-[var(--on-surface-variant)]">{run.generation_latency_ms ? formatDuration(run.generation_latency_ms / 1000) : '—'}</div>
                            </div>
                          </div>
                          
                          {run.generated_answer && (
                            <div className="mt-4 p-4 bg-[var(--surface-container-lowest)] border border-[var(--surface-container)]">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-2">GENERATED ANSWER</div>
                              <div className="font-body-sm text-[var(--on-surface)] prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[var(--surface-dim)] prose-pre:border prose-pre:border-[var(--surface-container)] prose-code:text-[var(--secondary)] prose-a:text-[var(--accent-indigo)] prose-headings:text-[var(--on-surface-strong)] prose-strong:text-[var(--accent-emerald)]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {run.generated_answer}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                          
                          {run.notes && (
                            <div className="mt-4 p-4 bg-[var(--surface-container)]/20 border-l-4 border-[var(--secondary)] font-body-sm text-[var(--on-surface)]">
                              <div className="text-[10px] font-label-caps tracking-widest text-[var(--secondary)] mb-1">EVALUATOR NOTES</div>
                              {run.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}
