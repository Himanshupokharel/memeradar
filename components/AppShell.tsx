import type { ReactNode } from 'react';
import { SearchBox } from './SearchBox';
import { AutoRefresh } from './AutoRefresh';
import { LiveNetworkStatus, LiveSidebarStatus } from './LiveSourceStatus';

const navigation = [
  { id: 'dashboard', href: '/', icon: '⌁', label: 'Dashboard' },
  { id: 'new', href: '/new-tokens', icon: '✦', label: 'New Tokens' },
  { id: 'trending', href: '/pre-trending', icon: '↗', label: 'Pre-Trending' },
  { id: 'alerts', href: '/alerts', icon: '◎', label: 'Alerts' },
];

export function AppShell({ active, children }: { active: string; children: ReactNode; source?: 'dexscreener' | 'mock'; updatedAt?: string }) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        {/* Hosted vinext navigation currently needs a native page load. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="brand" href="/"><span className="brand-mark">M</span><span>MemeRadar</span></a>
        <div className="nav-label">Workspace</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <a className={active === item.id ? 'nav-active' : ''} href={item.href} key={item.id}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
            </a>
          ))}
        </nav>
        <LiveSidebarStatus />
        <div className="sidebar-note">V2 · INFORMATIONAL ONLY</div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <SearchBox />
          <AutoRefresh />
          <LiveNetworkStatus />
          <a className="icon-button" href="/alerts" aria-label="View alerts">♢<b>3</b></a>
          <div className="avatar" title="Demo account">MR</div>
        </header>
        <div className="content">{children}</div>
      </section>
    </main>
  );
}
