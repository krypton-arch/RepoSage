'use client';

import Link from 'next/link';
import React from 'react';

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
            />
          </div>
        )}

        {title && <h2 className="text-headline-md">{title}</h2>}
      </div>

      <div className="header-right">
        {actions}

        <button className="btn btn-ghost btn-sm" aria-label="Notifications">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        <button className="btn btn-ghost btn-sm" aria-label="Help">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
      </div>
    </header>
  );
}
