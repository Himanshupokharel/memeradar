'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INTERVAL_SECONDS = 3;

export function AutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(INTERVAL_SECONDS);

  useEffect(() => {
    if (!enabled) return;
    let secondsRemaining = INTERVAL_SECONDS;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      secondsRemaining -= 1;
      if (secondsRemaining <= 0) {
        secondsRemaining = INTERVAL_SECONDS;
        setRemaining(secondsRemaining);
        router.refresh();
        return;
      }
      setRemaining(secondsRemaining);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [enabled, router]);

  return <span className={`auto-refresh ${enabled ? 'auto-refresh-on' : ''}`} title={enabled ? 'Live token discovery and market metrics refresh automatically every 3 seconds' : 'Automatic refresh resumes when the live provider reconnects'}><i />{enabled ? `AUTO ${remaining}S` : 'AUTO PAUSED'}</span>;
}
