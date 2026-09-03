'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INTERVAL_SECONDS = 3;

export function AutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(INTERVAL_SECONDS);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setRemaining((current) => {
        if (current <= 1) {
          router.refresh();
          return INTERVAL_SECONDS;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [enabled, router]);

  return <span className={`auto-refresh ${enabled ? 'auto-refresh-on' : ''}`} title={enabled ? 'Live token discovery and market metrics refresh automatically every 3 seconds' : 'Automatic refresh resumes when the live provider reconnects'}><i />{enabled ? `AUTO ${remaining}S` : 'AUTO PAUSED'}</span>;
}
