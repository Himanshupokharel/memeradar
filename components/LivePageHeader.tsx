'use client';

import { PageHeader } from './PageHeader';
import { useLiveMarket } from './LiveMarketProvider';

export function LivePageHeader(props: Omit<Parameters<typeof PageHeader>[0], 'feedLabel'> & { liveLabel: string }) {
  const { status } = useLiveMarket();
  const { liveLabel, ...pageHeaderProps } = props;
  return <PageHeader {...pageHeaderProps} feedLabel={status === 'live' ? liveLabel : status === 'connecting' ? 'CONNECTING LIVE FEED' : 'RETRYING · FALLBACK DATA'} />;
}
