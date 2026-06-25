'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { StaggerContainer, FadeUpItem, PageTransition, HoverCard } from '@/components/ui/animations';
import {
  projects,
  Project,
  formatDate,
} from '@/lib/api';

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'indexed') return 'badge badge-indexed';
  if (s === 'ingesting') return 'badge badge-ingesting';
  if (s === 'failed') return 'badge badge-failed';
  if (s === 'created') return 'badge badge-created';
  return 'badge badge-created';
}

function ProjectCardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton" style={{ width: '60%', height: 20, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: '100%', height: 14, marginBottom: 16 }} />
      <div className="skeleton" style={{ width: 60, height: 18, marginBottom: 16 }} />
      <div className="flex gap-lg">
        <div className="skeleton" style={{ width: 70, height: 12 }} />
        <div className="skeleton" style={{ width: 70, height: 12 }} />
      </div>
    </div>
  );
}

interface CreateProjectForm {
  name: string;
  description: string;
  source_type: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateProjectForm>({
    name: '',
    description: '',
    source_type: 'upload',
  });

  const fetchProjects = () => {
    setLoading(true);
    projects
      .list()
      .then((data) => setProjectList(data.results))
      .catch((err) => setError(err.message ?? 'Failed to load projects'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setCreating(true);
    try {
      await projects.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        source_type: form.source_type,
      });
      setShowModal(false);
      setForm({ name: '', description: '', source_type: 'upload' });
      fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const openModal = () => {
    setForm({ name: '', description: '', source_type: 'upload' });
    setShowModal(true);
  };

  return (
    <>
      <Header
        title="Projects"
        actions={
          <button className="btn btn-primary" onClick={openModal}>
            <span className="material-symbols-outlined">add</span>
            New Project
          </button>
        }
      />

      <PageTransition className="app-main">
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

        {loading ? (
          <div className="grid-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : projectList.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state-icon">
              folder_off
            </span>
            <p className="empty-state-title">No projects yet</p>
            <p className="empty-state-text text-body-sm">
              Create your first project to start indexing and querying your codebase.
            </p>
            <button className="btn btn-primary" onClick={openModal}>
              <span className="material-symbols-outlined">add</span>
              Create Project
            </button>
          </div>
        ) : (
          <StaggerContainer className="grid-3">
            {projectList.map((project) => (
              <FadeUpItem key={project.id}>
                <HoverCard
                  className="card"
                  style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div className="flex items-center justify-between mb-sm">
                    <div className="flex items-center gap-md" style={{ overflow: 'hidden' }}>
                      <h3 className="text-headline-md" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-xs">
                        {project.retrieval_mode && (
                          <span className="badge badge-config">{project.retrieval_mode}</span>
                        )}
                        {project.visibility && (
                          <span className="badge badge-text">{project.visibility}</span>
                        )}
                      </div>
                    </div>
                  <span className={statusBadgeClass(project.status)}>
                    {project.status}
                  </span>
                </div>

                {project.description && (
                  <p
                    className="text-body-sm text-muted mb-md"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {project.description}
                  </p>
                )}

                <div className="flex gap-lg mt-md" style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 'var(--space-md)' }}>
                  <div className="flex items-center gap-xs text-body-sm text-muted">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      description
                    </span>
                    {project.total_files.toLocaleString()} files
                  </div>
                  <div className="flex items-center gap-xs text-body-sm text-muted">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      data_object
                    </span>
                    {project.total_chunks.toLocaleString()} chunks
                  </div>
                </div>

                <div className="text-body-sm text-muted mt-sm">
                  {project.last_indexed_at
                    ? `Indexed ${formatDate(project.last_indexed_at)}`
                    : 'Not indexed yet'}
                </div>
                </HoverCard>
              </FadeUpItem>
            ))}
          </StaggerContainer>
        )}
      </PageTransition>

      {/* Create Project Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">New Project</h2>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="project-name" className="form-label">
                  Name <span className="text-error">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  className="form-input"
                  placeholder="My Awesome Project"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-description" className="form-label">
                  Description
                </label>
                <textarea
                  id="project-description"
                  className="form-input"
                  placeholder="A brief description of the project…"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="project-source-type" className="form-label">
                  Source Type
                </label>
                <select
                  id="project-source-type"
                  className="form-select"
                  value={form.source_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, source_type: e.target.value }))
                  }
                >
                  <option value="upload">File Upload</option>
                  <option value="local">Local Path</option>
                  <option value="github">GitHub Repository</option>
                </select>
              </div>

              <div className="flex justify-between" style={{ marginTop: 'var(--space-xl)' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !form.name.trim()}
                >
                  {creating ? (
                    <>
                      <span
                        className="material-symbols-outlined"
                        style={{ animation: 'spin 1s linear infinite', fontSize: 18 }}
                      >
                        progress_activity
                      </span>
                      Creating…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">add</span>
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
