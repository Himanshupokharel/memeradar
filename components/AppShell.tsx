import Link from 'next/link';
import type { ReactNode } from 'react';
import { SearchBox } from './SearchBox';

const navigation = [
  { id: 'dashboard', href: '/', icon: '⌁', label: 'Dashboard' },
  { id: 'new', href: '/new-tokens', icon: '✦', label: 'New Tokens' },
  { id: 'trending', href: '/pre-trending', icon: '↗', label: 'Pre-Trending' },
  { id: 'alerts', href: '/alerts', icon: '◎', label: 'Alerts' },
];

export function AppShell({ active, children, source = 'mock', updatedAt }: { active: string; children: ReactNode; source?: 'dexscreener' | 'mock'; updatedAt?: string }) {
  const isLive = source === 'dexscreener';
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
        <div className={`sidebar-card ${isLive ? 'sidebar-card-live' : ''}`}>
          <span className="live-dot" /> {isLive ? 'LIVE MARKET' : 'FALLBACK MODE'}
          <strong>{isLive ? 'DEX Screener connected' : 'Demo data connected'}</strong>
          <small>{updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}` : 'Provider status pending'}</small>
        </div>
        <div className="sidebar-note">V1 · INFORMATIONAL ONLY</div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <SearchBox />
          <span className={`network-pill ${isLive ? '' : 'network-pill-fallback'}`}><i /> {isLive ? 'SOLANA · LIVE' : 'SOLANA · DEMO'}</span>
          <Link className="icon-button" href="/alerts" aria-label="View alerts">♢<b>3</b></Link>
          <div className="avatar" title="Demo account">MR</div>
        </header>
        <div className="content">{children}</div>
      </section>
    </main>
  );
}
