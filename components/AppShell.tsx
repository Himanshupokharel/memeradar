import Link from 'next/link';
import type { ReactNode } from 'react';
import { SearchBox } from './SearchBox';

const navigation = [
  { id: 'dashboard', href: '/', icon: '⌁', label: 'Dashboard' },
  { id: 'new', href: '/new-tokens', icon: '✦', label: 'New Tokens' },
  { id: 'trending', href: '/pre-trending', icon: '↗', label: 'Pre-Trending' },
  { id: 'alerts', href: '/alerts', icon: '◎', label: 'Alerts' },
];

export function AppShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/"><span className="brand-mark">M</span><span>MemeRadar</span></Link>
        <div className="nav-label">Workspace</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <Link className={active === item.id ? 'nav-active' : ''} href={item.href} key={item.id}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="live-dot" /> DEMO MODE
          <strong>Mock data connected</strong>
          <small>Explore every screen safely.</small>
        </div>
        <div className="sidebar-note">V1 · INFORMATIONAL ONLY</div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <SearchBox />
          <span className="network-pill"><i /> SOLANA</span>
          <Link className="icon-button" href="/alerts" aria-label="View alerts">♢<b>3</b></Link>
          <div className="avatar" title="Demo account">MR</div>
        </header>
        <div className="content">{children}</div>
      </section>
    </main>
  );
}
