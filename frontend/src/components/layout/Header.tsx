'use client';

import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { projects, Project } from '@/lib/api';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface HeaderProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export default function Header({ title, breadcrumbs, actions }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [failedProjects, setFailedProjects] = useState<Project[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch failed projects for notifications
    projects.list().then((data) => {
      const failed = data.results.filter(p => p.status === 'failed');
      setFailedProjects(failed);
    }).catch(console.error);
    
    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/projects?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-sm text-body-sm">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className="text-muted" style={{ fontSize: 12 }}>/</span>
                )}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-muted" style={{ transition: 'color var(--transition-fast)' }}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : (
          <div className="header-search">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Search repositories, files…"
              aria-label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        )}

        {title && <h2 className="text-headline-md">{title}</h2>}
      </div>

      <div className="header-right">
        {actions}

        <div className="relative" ref={notifRef}>
          <button 
            className="btn btn-ghost btn-sm relative" 
            aria-label="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <span className="material-symbols-outlined">notifications</span>
            {failedProjects.length > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--error)] rounded-full animate-ping"></span>
            )}
            {failedProjects.length > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--error)] rounded-full"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[var(--surface-container-lowest)] border-2 border-[var(--surface-container)] shadow-[4px_4px_0px_0px_rgba(30,41,59,0.3)] z-50">
              <div className="p-3 border-b-2 border-[var(--surface-container)] bg-[var(--surface-dim)]">
                <h3 className="font-label-caps text-sm text-[var(--on-surface-strong)]">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {failedProjects.length > 0 ? (
                  failedProjects.map(p => (
                    <div key={p.id} className="p-3 border-b border-[var(--surface-container)] hover:bg-[var(--surface-container)] transition-colors">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[var(--error)] text-sm mt-0.5">error</span>
                        <div>
                          <p className="text-sm font-bold text-[var(--on-surface-strong)]">Ingestion Failed</p>
                          <p className="text-xs text-[var(--on-surface-variant)] mt-1">Project <strong>{p.name}</strong> failed during vectorization.</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-[var(--on-surface-variant)]">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button className="btn btn-ghost btn-sm" aria-label="Help">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>
    </header>
  );
}
