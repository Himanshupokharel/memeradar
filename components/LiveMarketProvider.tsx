'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { tokens as fallbackTokens } from '@/lib/mock-data';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';
import type { TokenSnapshot } from '@/lib/types';

type LiveMarketContextValue = {
  snapshot: TokenSnapshot;
  status: 'connecting' | 'live' | 'fallback';
  storageStatus: 'connecting' | 'saving' | 'connected' | 'unavailable';
};

const initialSnapshot: TokenSnapshot = {
  tokens: fallbackTokens,
  source: 'mock',
  updatedAt: new Date(0).toISOString(),
  notice: 'Connecting to the live market feed…',
};

const LiveMarketContext = createContext<LiveMarketContextValue>({ snapshot: initialSnapshot, status: 'connecting', storageStatus: 'connecting' });

export function LiveMarketProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [status, setStatus] = useState<LiveMarketContextValue['status']>('connecting');
  const [storageStatus, setStorageStatus] = useState<LiveMarketContextValue['storageStatus']>('connecting');
  const lastStoredAt = useRef(0);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    async function update() {
      if (document.visibilityState === 'visible') {
        const next = await tokenProvider.getSnapshot();
        if (!stopped) {
          setSnapshot(next);
          setStatus(next.source === 'dexscreener' ? 'live' : 'fallback');
          if (next.source === 'dexscreener' && Date.now() - lastStoredAt.current >= 60_000) {
            lastStoredAt.current = Date.now();
            setStorageStatus('saving');
            void fetch('/api/snapshots', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens: next.tokens }),
            }).then((response) => {
              if (!stopped) setStorageStatus(response.ok ? 'connected' : 'unavailable');
            }).catch(() => { if (!stopped) setStorageStatus('unavailable'); });
          }
        }
      }
      if (!stopped) timer = window.setTimeout(update, 3_000);
    }
    void update();
    return () => { stopped = true; if (timer) window.clearTimeout(timer); };
  }, []);

  const value = useMemo(() => ({ snapshot, status, storageStatus }), [snapshot, status, storageStatus]);
  return <LiveMarketContext.Provider value={value}>{children}</LiveMarketContext.Provider>;
}

export function useLiveMarket() {
  return useContext(LiveMarketContext);
}
