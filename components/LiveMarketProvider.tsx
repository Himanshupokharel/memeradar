'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { tokens as fallbackTokens } from '@/lib/mock-data';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';
import { applyPercentileRanks } from '@/lib/percentiles';
import type { AdvancedMomentum, Token, TokenSnapshot } from '@/lib/types';

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
  const lastMomentumAt = useRef(0);
  const momentumCache = useRef<Record<string, AdvancedMomentum>>({});

  function withMomentum(token: Token) {
    const momentum = momentumCache.current[token.id];
    return momentum ? { ...token, advancedMomentum: momentum, sparkline: momentum.sparkline.length >= 3 ? momentum.sparkline : token.sparkline } : token;
  }

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    async function update() {
      if (document.visibilityState === 'visible') {
        const next = await tokenProvider.getSnapshot();
        if (!stopped) {
          const rankedTokens = applyPercentileRanks(next.tokens.map(withMomentum));
          setSnapshot({ ...next, tokens: rankedTokens });
          setStatus(next.source === 'dexscreener' ? 'live' : 'fallback');
          if (next.source === 'dexscreener' && Date.now() - lastMomentumAt.current >= 15_000) {
            lastMomentumAt.current = Date.now();
            const mints = next.tokens.slice(0, 60).map((token) => token.id).join(',');
            void fetch(`/api/momentum?mints=${encodeURIComponent(mints)}`, { cache: 'no-store' })
              .then(async (response) => response.ok ? response.json() as Promise<{ signals: Record<string, AdvancedMomentum> }> : { signals: {} })
              .then((data) => {
                if (stopped) return;
                momentumCache.current = { ...momentumCache.current, ...data.signals };
                setSnapshot((current) => ({ ...current, tokens: applyPercentileRanks(current.tokens.map(withMomentum)) }));
              }).catch(() => { /* Current market metrics remain available while history is collecting. */ });
          }
          if (next.source === 'dexscreener' && Date.now() - lastStoredAt.current >= 60_000) {
            lastStoredAt.current = Date.now();
            setStorageStatus('saving');
            void fetch('/api/snapshots', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokens: rankedTokens }),
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
