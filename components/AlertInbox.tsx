'use client';

import { useEffect, useRef, useState } from 'react';
import type { AlertEvent } from '@/lib/types';
import { TokenLogo, formatAge, formatMoney } from './TokenPrimitives';

type ModelContext = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: unknown) => unknown | Promise<unknown>;
  }, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

type FeedResponse = { events: AlertEvent[]; unreadCount: number };

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export function AlertInbox() {
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const eventsRef = useRef<AlertEvent[]>([]);

  async function setRead(event: AlertEvent, read: boolean) {
    const previous = events;
    setEvents((current) => current.map((item) => item.id === event.id ? { ...item, readAt: read ? new Date().toISOString() : undefined } : item));
    setUnreadCount((current) => Math.max(0, current + (read ? -1 : 1)));
    try {
      const response = await fetch('/api/alert-events', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: event.id, read }),
      });
      if (!response.ok) throw new Error('Update failed');
      window.dispatchEvent(new Event('memeradar-alerts-updated'));
    } catch {
      setEvents(previous);
      setUnreadCount(previous.filter((item) => !item.readAt).length);
      setError('That alert could not be updated.');
    }
  }

  async function markAllRead() {
    const unread = eventsRef.current.filter((event) => !event.readAt).length;
    if (!unread) return { updated: 0 };
    const response = await fetch('/api/alert-events', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true, read: true }),
    });
    if (!response.ok) throw new Error('Alerts could not be marked read.');
    const readAt = new Date().toISOString();
    setEvents((current) => current.map((event) => ({ ...event, readAt: event.readAt || readAt })));
    setUnreadCount(0);
    window.dispatchEvent(new Event('memeradar-alerts-updated'));
    setNotice(`${unread} alert${unread === 1 ? '' : 's'} marked as read.`);
    window.setTimeout(() => setNotice(''), 3000);
    return { updated: unread };
  }

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    async function refresh(initial = false) {
      try {
        const response = await fetch('/api/alert-events', { cache: 'no-store' });
        if (!response.ok) throw new Error('Feed unavailable');
        const data = await response.json() as FeedResponse;
        if (active) {
          setEvents(data.events);
          setUnreadCount(data.unreadCount);
          setError('');
        }
      } catch {
        if (active && initial) setError('The saved alert feed could not be loaded. Rules and market scanning are still running.');
      } finally {
        if (active && initial) setLoading(false);
      }
      if (active) timer = window.setTimeout(refresh, 15_000);
    }
    void refresh(true);
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, []);

  useEffect(() => { eventsRef.current = events; }, [events]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: 'list_recent_alert_events',
        title: 'List recent MemeRadar alerts',
        description: 'Read the ten most recent alert matches currently visible in MemeRadar.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute() {
          return {
            unreadCount: eventsRef.current.filter((event) => !event.readAt).length,
            events: eventsRef.current.slice(0, 10).map((event) => ({
              id: event.id, rule: event.ruleName, symbol: event.symbol, score: event.score,
              liquidity: event.liquidity, ageMinutes: event.ageMinutes, triggeredAt: event.triggeredAt,
              read: Boolean(event.readAt),
            })),
          };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
      void Promise.resolve(context.registerTool({
        name: 'mark_all_alert_events_read',
        title: 'Mark all MemeRadar alerts read',
        description: 'Mark every unread event in the MemeRadar Alert Inbox as read.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: () => markAllRead(),
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch { /* WebMCP is optional in browsers that do not support it. */ }
    return () => lifecycle.abort();
  }, []);

  const visible = filter === 'unread' ? events.filter((event) => !event.readAt) : events;

  return <section className="panel alert-inbox">
    <div className="panel-head">
      <div><span className="panel-kicker">ALERT INBOX</span><h2>Recent rule matches</h2></div>
      <div className="inbox-actions">
        <div className="inbox-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Unread {unreadCount > 0 && <b>{unreadCount}</b>}</button></div>
        <button className="text-button" type="button" disabled={!unreadCount} onClick={() => void markAllRead().catch(() => setError('Alerts could not be marked read.'))}>Mark all read</button>
      </div>
    </div>
    {error && <p className="inbox-error" role="alert">{error}</p>}
    {loading && <div className="empty-state"><strong>Loading recent matches…</strong><span>Connecting to the 24/7 alert history.</span></div>}
    {!loading && visible.length === 0 && <div className="empty-state"><strong>{filter === 'unread' ? 'You are all caught up' : 'No alert matches yet'}</strong><span>{filter === 'unread' ? 'New matches will appear here automatically.' : 'Create a rule below; its first matches will be saved here.'}</span></div>}
    {!loading && visible.length > 0 && <div className="event-list">{visible.map((event) => <article className={event.readAt ? 'event-read' : ''} key={event.id}>
      <span className="event-state" title={event.readAt ? 'Read' : 'Unread'} />
      <TokenLogo symbol={event.symbol} color="#55e6a5" imageUrl={event.imageUrl} />
      <div className="event-copy"><div><strong>{event.symbol} matched</strong><small>{event.ruleName}</small></div><p>{event.message}</p><span>{relativeTime(event.triggeredAt)} · Score {event.score} · {formatMoney(event.liquidity)} liquidity · {formatAge(event.ageMinutes)}</span></div>
      <div className="event-actions">{event.mint && <a className="secondary-button" href={`/token/${event.mint}`}>Analyze token</a>}<button className="text-button" type="button" onClick={() => void setRead(event, !event.readAt)}>{event.readAt ? 'Mark unread' : 'Mark read'}</button></div>
    </article>)}</div>}
    <div className="delivery-strip"><span>IN-APP · ACTIVE</span><p>This inbox checks for new matches every 15 seconds. Telegram delivery is prepared but remains off until its private credentials are connected.</p></div>
    {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
  </section>;
}
