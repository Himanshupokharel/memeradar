'use client';

import { useLiveMarket } from './LiveMarketProvider';

export function LiveSidebarStatus() {
  const { snapshot, status, storageStatus } = useLiveMarket();
  const live = status === 'live';
  return <div className={`sidebar-card ${live ? 'sidebar-card-live' : ''}`}>
    <span className="live-dot" /> {live ? 'LIVE MARKET' : status === 'connecting' ? 'CONNECTING' : 'RETRYING LIVE FEED'}
    <strong>{live ? 'DEX Screener connected' : status === 'connecting' ? 'Opening direct feed' : 'Demo fallback active'}</strong>
    <small>{status === 'connecting' ? 'First data is loading' : `Updated ${new Date(snapshot.updatedAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}</small>
    <small className={`storage-line storage-${storageStatus}`}>{storageStatus === 'connected' ? '● History saving every minute' : storageStatus === 'saving' ? '● Saving market history…' : storageStatus === 'unavailable' ? '○ History storage unavailable' : '○ History storage connecting'}</small>
  </div>;
}

export function LiveNetworkStatus() {
  const { status } = useLiveMarket();
  const live = status === 'live';
  return <span className={`network-pill ${live ? '' : 'network-pill-fallback'}`}><i /> {live ? 'SOLANA · LIVE' : status === 'connecting' ? 'SOLANA · CONNECTING' : 'SOLANA · DEMO'}</span>;
}
