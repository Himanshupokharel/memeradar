'use client';

import { useLiveMarket } from './LiveMarketProvider';

export function AutoRefresh() {
  const { status } = useLiveMarket();
  const enabled = status === 'live';
  return <span className={`auto-refresh ${enabled ? 'auto-refresh-on' : ''}`} title={enabled ? 'Live token discovery and market metrics refresh automatically every 3 seconds' : 'Connecting to the direct live feed'}><i />{enabled ? 'AUTO 3S' : status === 'connecting' ? 'CONNECTING' : 'RETRYING'}</span>;
}
