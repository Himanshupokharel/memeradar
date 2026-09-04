'use client';

import { useEffect, useState } from 'react';

export function AlertBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    async function refresh(schedule = true) {
      try {
        const response = await fetch('/api/alert-events?summary=true', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json() as { unreadCount?: number };
          if (active) setUnread(Number(data.unreadCount || 0));
        }
      } finally {
        if (active && schedule) timer = window.setTimeout(refresh, 20_000);
      }
    }
    const updateNow = () => { void refresh(false); };
    window.addEventListener('memeradar-alerts-updated', updateNow);
    void refresh();
    return () => { active = false; window.removeEventListener('memeradar-alerts-updated', updateNow); if (timer) window.clearTimeout(timer); };
  }, []);

  return <a className="icon-button" href="/alerts" aria-label={`${unread} unread alerts`}>♢{unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}</a>;
}
