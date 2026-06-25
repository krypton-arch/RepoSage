'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { EvaluationCase, EvaluationRun, formatMs, formatPercent, formatDuration, timeAgo } from '@/lib/api';

interface EvalCaseRowProps {
  evalCase: EvaluationCase;
  isExpanded: boolean;
  onToggle: () => void;
  runs: EvaluationRun[];
  index: number;
}

export default function EvalCaseRow({
  evalCase,
  isExpanded,
  onToggle,
  runs,
  index,
}: EvalCaseRowProps) {
  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
        onClick={onToggle}
        className="group hover:bg-[#1e293b]/30 transition-colors"
        style={{ cursor: 'pointer', background: isExpanded ? 'rgba(30,41,59,0.5)' : undefined }}
      >
        <td className="px-4 py-4 border-r border-[#1e293b]">
          <motion.span
            className="material-symbols-outlined text-[#94a3b8]"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 20 }}
          >
            chevron_right
          </motion.span>
        </td>
        <td className="px-4 py-4 text-white font-body-md border-r border-[#1e293b]" style={{ maxWidth: '400px' }}>
          <div className="line-clamp-2 leading-relaxed">{evalCase.question}</div>
        </td>
        <td className="px-4 py-4 text-[#38bdf8] font-code-sm border-r border-[#1e293b]" style={{ maxWidth: '300px' }}>
          <div className="line-clamp-2 leading-relaxed">{evalCase.expected_answer_traits || '—'}</div>
        </td>
        <td className="px-4 py-4 border-r border-[#1e293b]">
          {evalCase.tags && evalCase.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {evalCase.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 text-[10px] font-label-caps tracking-wider border border-[#334155] text-[#94a3b8] rounded-sm">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[#64748b]">—</span>
          )}
        </td>
        <td className="px-4 py-4 text-[#64748b] font-code-sm">{timeAgo(evalCase.created_at)}</td>
      </motion.tr>
      
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={5} className="p-0 border-b-2 border-t-2 border-[#1e293b] bg-[#0c0e12]">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-8">
                  {runs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#1e293b] text-[#64748b]">
                      <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">history_toggle_off</span>
                      <p className="font-code-md">No evaluation runs yet. Click &quot;RUN_SUITE&quot; to begin.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {runs.map((run) => (
                        <div
                          key={run.id}
                          className="border border-[#1e293b] bg-[#111317] p-6 shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]"
                        >
                          <div className="flex items-center justify-between mb-4 border-b border-[#1e293b] pb-4">
                            <div className="flex items-center gap-4">
                              <span className={`px-3 py-1 font-label-caps tracking-widest text-[11px] border ${
                                run.status === 'completed' ? 'border-[#10b981] text-[#10b981] bg-[#10b981]/10' :
                                run.status === 'failed' ? 'border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10' :
                                'border-[#eab308] text-[#eab308] bg-[#eab308]/10'
                              }`}>
                                {run.status}
                              </span>
                              <span className="font-code-sm text-[#64748b]">{timeAgo(run.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              {run.retrieval_precision !== null && (
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[#38bdf8] text-[16px]">target</span>
                                  <span className="font-code-md text-white">
                                    Precision: <span className="text-[#38bdf8]">{formatPercent(run.retrieval_precision)}</span>
                                  </span>
                                </div>
                              )}
                              {run.retrieval_latency_ms !== null && (
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[#94a3b8] text-[16px]">timer</span>
                                  <span className="font-code-sm text-[#94a3b8]">
                                    {formatMs(run.retrieval_latency_ms)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-[#0c0e12] border border-[#1e293b] p-3">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-1">GROUNDEDNESS</div>
                              <div className="font-code-lg text-white">{run.groundedness_rating || '—'}</div>
                            </div>
                            <div className="bg-[#0c0e12] border border-[#1e293b] p-3">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-1">USEFULNESS</div>
                              <div className="font-code-lg text-white">{run.usefulness_rating || '—'}</div>
                            </div>
                            <div className="bg-[#0c0e12] border border-[#1e293b] p-3">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-1">CONTEXT TOKENS</div>
                              <div className="font-code-lg text-[#38bdf8]">{run.context_tokens_used ?? '—'}</div>
                            </div>
                            <div className="bg-[#0c0e12] border border-[#1e293b] p-3">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-1">GENERATION TIME</div>
                              <div className="font-code-lg text-[#94a3b8]">{run.generation_latency_ms ? formatDuration(run.generation_latency_ms / 1000) : '—'}</div>
                            </div>
                          </div>
                          
                          {run.generated_answer && (
                            <div className="mt-4 p-4 bg-[#0c0e12] border border-[#1e293b]">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#64748b] mb-2">GENERATED ANSWER</div>
                              <p className="font-body-sm text-[#e2e2e8] whitespace-pre-wrap">
                                {run.generated_answer}
                              </p>
                            </div>
                          )}
                          
                          {run.notes && (
                            <div className="mt-4 p-4 bg-[#1e293b]/20 border-l-4 border-[#38bdf8] font-body-sm text-[#e2e2e8]">
                              <div className="text-[10px] font-label-caps tracking-widest text-[#38bdf8] mb-1">EVALUATOR NOTES</div>
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
