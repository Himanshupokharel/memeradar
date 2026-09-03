'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { tokens as fallbackTokens } from '@/lib/mock-data';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';
import type { TokenSnapshot } from '@/lib/types';

type LiveMarketContextValue = {
  snapshot: TokenSnapshot;
  status: 'connecting' | 'live' | 'fallback';
};

const initialSnapshot: TokenSnapshot = {
  tokens: fallbackTokens,
  source: 'mock',
  updatedAt: new Date(0).toISOString(),
  notice: 'Connecting to the live market feed…',
};

const LiveMarketContext = createContext<LiveMarketContextValue>({ snapshot: initialSnapshot, status: 'connecting' });

export function LiveMarketProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [status, setStatus] = useState<LiveMarketContextValue['status']>('connecting');

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    async function update() {
      if (document.visibilityState === 'visible') {
        const next = await tokenProvider.getSnapshot();
        if (!stopped) {
          setSnapshot(next);
          setStatus(next.source === 'dexscreener' ? 'live' : 'fallback');
        }
      }
      if (!stopped) timer = window.setTimeout(update, 3_000);
    }
    void update();
    return () => { stopped = true; if (timer) window.clearTimeout(timer); };
  }, []);

  const value = useMemo(() => ({ snapshot, status }), [snapshot, status]);
  return <LiveMarketContext.Provider value={value}>{children}</LiveMarketContext.Provider>;
}

export function useLiveMarket() {
  return useContext(LiveMarketContext);
}
