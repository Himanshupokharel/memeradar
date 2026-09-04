'use client';

import { useLiveMarket } from './LiveMarketProvider';

export function AutoRefresh() {
  const { status } = useLiveMarket();
  const enabled = status === 'live';
  return <span className={`auto-refresh ${enabled ? 'auto-refresh-on' : ''}`} title={enabled ? 'Market metrics rotate every 3 seconds; the five-channel discovery pool refreshes every 15 seconds' : 'Connecting to the direct live feed'}><i />{enabled ? 'MARKET 3S' : status === 'connecting' ? 'CONNECTING' : 'RETRYING'}</span>;
}
