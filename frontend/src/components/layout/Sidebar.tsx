'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { label: 'Dashboard', icon: 'dashboard', href: '/' },
  { label: 'Projects', icon: 'folder_open', href: '/projects' },
  { label: 'Intelligence Hub', icon: 'psychology', href: '/query' },
  { label: 'Evaluation', icon: 'analytics', href: '/evaluation' },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">R</div>
        <div className="sidebar-brand-text">
          <h1>RepoSage</h1>
          <span>v1.0.0</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-link${isActive(link.href) ? ' active' : ''}`}
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <Link
          href="/settings"
          className={`sidebar-link${isActive('/settings') ? ' active' : ''}`}
        >
          <span className="material-symbols-outlined">settings</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
