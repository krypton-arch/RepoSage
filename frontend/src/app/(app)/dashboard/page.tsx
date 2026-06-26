'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { StaggerContainer, FadeUpItem, PageTransition, HoverCard } from '@/components/ui/animations';
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
  if (s === 'completed') return 'font-label-caps text-[var(--accent-emerald)] bg-[var(--accent-emerald)]/10 px-2 py-1 border border-[var(--accent-emerald)]/30';
  if (s === 'running' || s === 'ingesting') return 'font-label-caps text-[var(--secondary)] bg-[var(--secondary)]/10 px-2 py-1 border border-[var(--secondary)]/30 animate-pulse';
  if (s === 'failed') return 'font-label-caps text-[var(--error)] bg-[var(--error)]/10 px-2 py-1 border border-[var(--error)]/30';
  if (s === 'pending') return 'font-label-caps text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-1 border border-[#f59e0b]/30';
  return 'font-label-caps text-[var(--on-surface-variant)] bg-[var(--surface-container)] px-2 py-1 border border-[var(--surface-container-highest)]';
}

function StatCardSkeleton() {
  return (
    <div className="border-2 border-[var(--surface-container)] bg-[var(--surface-dim)] p-6 animate-pulse">
      <div className="w-20 h-3 bg-[var(--surface-container)] mb-4"></div>
      <div className="w-24 h-8 bg-[var(--surface-container-highest)]"></div>
    </div>
  );
}

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

/* ---- Staleness Indicator Bar ---- */
function StalenessBar({ ratio }: { ratio: number }) {
  const percent = Math.round(ratio * 100);
  const color =
    percent === 0
      ? '#10b981' // emerald
      : percent < 25
        ? '#f59e0b' // amber
        : '#ef4444'; // red

  return (
    <div className="w-full flex items-center gap-4 mt-2">
      <div className="flex-1 h-2 bg-[var(--surface-container-lowest)] border border-[var(--surface-container)] overflow-hidden">
        <div
          style={{ width: `${Math.max(percent, 2)}%`, backgroundColor: color }}
          className="h-full transition-all duration-500"
        />
      </div>
      <span className="font-code-sm text-[var(--on-surface-variant)] w-12 text-right">
        {percent}%
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
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await dashboard.stats();
        if (active) setStats(data);
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to load dashboard metrics');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchStaleness = async () => {
      try {
        setStalenessLoading(true);
        const projList = await projects.list();
        const reports = await Promise.all(
          (projList.results || []).map(async (p) => {
            try {
              const r = await projects.staleness(p.id);
              return { project: p, report: r };
            } catch (err) {
              console.warn(`Failed to fetch staleness for ${p.id}`, err);
              return null;
            }
          })
        );
        if (active) {
          setStalenessData(reports.filter(Boolean) as ProjectStaleness[]);
        }
      } catch (err) {
        console.warn('Failed to load project list for staleness', err);
      } finally {
        if (active) setStalenessLoading(false);
      }
    };
    fetchStaleness();
    return () => { active = false; };
  }, []);

  const statCards = stats
    ? [
        {
          label: 'Total Projects',
          value: stats.total_projects,
          icon: 'hub',
        },
        {
          label: 'Total Documents',
          value: stats.total_files,
          icon: 'description',
        },
        {
          label: 'Total Chunks',
          value: stats.total_chunks,
          icon: 'data_object',
        },
        {
          label: 'Total Queries',
          value: stats.total_queries,
          icon: 'search',
        },
      ]
    : [];

  const getStalenessRatio = (report: StalenessReport) => 
    report.total_chunks > 0 ? report.stale_chunks / report.total_chunks : 0;

  const staleProjects = stalenessData.filter((d) => getStalenessRatio(d.report) > 0);
  const healthyProjects = stalenessData.filter((d) => getStalenessRatio(d.report) === 0);

  return (
    <>
      <Header title="SYSTEM_DASHBOARD" />

      <PageTransition className="px-6 py-8 max-w-7xl mx-auto w-full text-[var(--on-surface)]">
        {error && (
          <div className="border-2 border-[var(--error)] bg-[var(--error)]/10 p-4 mb-8 flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--error)]">error</span>
            <span className="font-code-md text-[var(--error)]">{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCards.map((card) => (
                <FadeUpItem key={card.label}>
                  <div className="border-2 border-[var(--surface-container)] bg-[var(--surface-dim)] p-6 h-full shadow-[4px_4px_0px_0px_rgba(30,41,59,1)] transition-colors hover:border-[var(--accent-indigo)] group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-label-caps text-[var(--on-surface-variant)] group-hover:text-[var(--accent-indigo)] transition-colors">{card.label}</span>
                      <span className="material-symbols-outlined text-[var(--surface-container-highest)] group-hover:text-[var(--accent-indigo)] transition-colors">
                        {card.icon}
                      </span>
                    </div>
                    <div className="font-code-lg text-4xl text-[var(--on-surface-strong)] font-bold tracking-tighter">
                      {card.value.toLocaleString()}
                    </div>
                  </div>
                </FadeUpItem>
              ))}
        </StaggerContainer>

        {/* ======== Staleness Overview (Node Instances) ======== */}
        <FadeUpItem className="mt-12">
          <div className="flex items-center justify-between border-b-2 border-[var(--surface-container)] pb-4 mb-6">
            <h2 className="font-headline-md flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--accent-indigo)]">memory</span>
              ACTIVE_INSTANCES
            </h2>
            {staleProjects.length > 0 && (
              <span className="font-label-caps text-[#f59e0b] border border-[#f59e0b] px-3 py-1 bg-[#f59e0b]/10">
                {staleProjects.length} OUT_OF_SYNC
              </span>
            )}
            {!stalenessLoading && staleProjects.length === 0 && stalenessData.length > 0 && (
              <span className="font-label-caps text-[var(--accent-emerald)] border border-[var(--accent-emerald)] px-3 py-1 bg-[var(--accent-emerald)]/10 flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--accent-emerald)] rounded-none animate-pulse"></div>
                ALL_NODES_SYNCED
              </span>
            )}
          </div>

          {stalenessLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-[var(--surface-dim)] border-2 border-[var(--surface-container)] animate-pulse"></div>
              ))}
            </div>
          ) : stalenessData.length === 0 ? (
            <div className="border-2 border-[var(--surface-container)] border-dashed p-12 flex flex-col items-center justify-center text-center opacity-50">
              <span className="material-symbols-outlined text-[48px] text-[var(--on-surface-variant)] mb-4">inventory_2</span>
              <p className="font-body-md text-[var(--on-surface-variant)]">NO INFRASTRUCTURE DEPLOYED</p>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stale projects first, then healthy */}
              {[...staleProjects, ...healthyProjects].map(({ project: proj, report }) => {
                const ratio = getStalenessRatio(report);
                const isStale = ratio > 0;
                
                return (
                  <FadeUpItem key={proj.id}>
                    <div
                      onClick={() => router.push(`/projects/${proj.id}`)}
                      className={`cursor-pointer border-2 p-6 transition-all group ${
                        isStale 
                          ? 'border-[#f59e0b] bg-[#f59e0b]/5 hover:bg-[#f59e0b]/10 shadow-[6px_6px_0px_0px_rgba(245,158,11,0.2)]' 
                          : 'border-[var(--surface-container)] bg-[var(--surface-dim)] hover:border-[var(--accent-indigo)] shadow-[4px_4px_0px_0px_rgba(30,41,59,1)]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-[var(--on-surface-variant)] group-hover:text-[var(--on-surface-strong)] transition-colors">dns</span>
                          <span className="font-code-md font-bold text-[var(--on-surface-strong)] tracking-tight truncate max-w-[200px]">
                            {proj.name}
                          </span>
                        </div>
                        {isStale ? (
                          <span className="font-label-caps text-[#f59e0b]">STALE</span>
                        ) : (
                          <span className="font-label-caps text-[var(--accent-emerald)] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-[var(--accent-emerald)]"></div> READY
                          </span>
                        )}
                      </div>

                      <StalenessBar ratio={ratio} />

                      <div className="flex justify-between items-center mt-6 border-t border-[var(--surface-container)] pt-4">
                        <span className="font-code-sm text-[var(--on-surface-variant)]">
                          {report.stale_chunks}/{report.total_chunks} CHUNKS
                        </span>
                        <div className="flex items-center gap-4 text-[var(--on-surface-variant)]">
                          <span className="font-label-caps text-[10px]">P: v{report.current_versions.parser_version}</span>
                          <span className="font-label-caps text-[10px]">C: v{report.current_versions.chunker_version}</span>
                        </div>
                      </div>
                    </div>
                  </FadeUpItem>
                );
              })}
            </StaggerContainer>
          )}
        </FadeUpItem>

        {/* Recent Ingestion Jobs */}
        {loading ? (
          <TableSkeleton />
        ) : (
          <FadeUpItem className="mt-16">
            <div className="flex items-center justify-between border-b-2 border-[var(--surface-container)] pb-4 mb-6">
              <h2 className="font-headline-md flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--accent-indigo)]">terminal</span>
                INGESTION_LOGS
              </h2>
              {stats && stats.failed_jobs > 0 && (
                <span className="font-label-caps text-[var(--error)] border border-[var(--error)] px-3 py-1 bg-[var(--error)]/10">
                  {stats.failed_jobs} ERRORS
                </span>
              )}
            </div>

            {stats && stats.recent_jobs.length > 0 ? (
              <div className="border-2 border-[var(--surface-container)] bg-[var(--surface-container-lowest)] overflow-x-auto shadow-[8px_8px_0px_0px_rgba(30,41,59,1)]">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-[var(--surface-dim)] border-b-2 border-[var(--surface-container)]">
                    <tr>
                      <th className="font-label-caps text-[var(--on-surface-variant)] py-4 px-6 border-r border-[var(--surface-container)]">NODE_TARGET</th>
                      <th className="font-label-caps text-[var(--on-surface-variant)] py-4 px-6 border-r border-[var(--surface-container)]">STATE</th>
                      <th className="font-label-caps text-[var(--on-surface-variant)] py-4 px-6 border-r border-[var(--surface-container)]">FILES</th>
                      <th className="font-label-caps text-[var(--on-surface-variant)] py-4 px-6 border-r border-[var(--surface-container)]">CHUNKS</th>
                      <th className="font-label-caps text-[var(--on-surface-variant)] py-4 px-6 border-r border-[var(--surface-container)]">EXEC_TIME</th>
                      <th className="font-label-caps text-[var(--on-surface-variant)] py-4 px-6">TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody className="font-code-md text-sm">
                    {stats.recent_jobs.map((job: IngestionJob) => (
                      <tr key={job.id} className="border-b border-[var(--surface-container)] hover:bg-[var(--surface-dim)] transition-colors">
                        <td className="py-4 px-6 text-[var(--on-surface-strong)] border-r border-[var(--surface-container)]">
                          {job.project_name ?? job.project}
                        </td>
                        <td className="py-4 px-6 border-r border-[var(--surface-container)]">
                          <span className={statusBadgeClass(job.status)}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[var(--on-surface-variant)] border-r border-[var(--surface-container)]">
                          {job.processed_files}/{job.total_files}
                        </td>
                        <td className="py-4 px-6 text-[var(--on-surface-variant)] border-r border-[var(--surface-container)]">
                          {job.total_chunks_created.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-[var(--on-surface-variant)] border-r border-[var(--surface-container)]">
                          {formatDuration(job.duration_seconds)}
                        </td>
                        <td className="py-4 px-6 text-[var(--accent-indigo)]">
                          {timeAgo(job.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border-2 border-[var(--surface-container)] border-dashed p-12 flex flex-col items-center justify-center text-center opacity-50">
                <span className="material-symbols-outlined text-[48px] text-[var(--on-surface-variant)] mb-4">hourglass_empty</span>
                <p className="font-code-md text-[var(--on-surface-variant)]">NO_INGESTION_DATA_FOUND</p>
                <p className="font-label-caps text-[var(--accent-indigo)] mt-2">INITIALIZE PROJECT TO COMMENCE LOGGING</p>
              </div>
            )}
          </FadeUpItem>
        )}
      </PageTransition>
    </>
  );
}
