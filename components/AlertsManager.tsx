'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { AlertRule } from '@/lib/types';
import { formatMoney } from './TokenPrimitives';

export function AlertsManager() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [name, setName] = useState('My signal rule');
  const [score, setScore] = useState(75);
  const [liquidity, setLiquidity] = useState(50000);
  const [age, setAge] = useState(60);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void fetch('/api/alerts', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Persistent alert storage is unavailable.');
        return response.json() as Promise<{ rules: AlertRule[] }>;
      })
      .then((data) => { if (active) setRules(data.rules); })
      .catch(() => { if (active) setError('Could not connect to saved alerts. The live market pages still work.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }

  async function addRule(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || 'Untitled rule', score, liquidity, maxAge: age }),
      });
      if (!response.ok) throw new Error('Save failed');
      const data = await response.json() as { rule: AlertRule };
      setRules((current) => [data.rule, ...current]);
      flash(`“${data.rule.name}” is saved and watching live snapshots.`);
    } catch {
      setError('The rule could not be saved. Please try again after storage reconnects.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(rule: AlertRule) {
    const enabled = !rule.enabled;
    setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled } : item));
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: rule.id, enabled }),
      });
      if (!response.ok) throw new Error('Update failed');
      flash(`${rule.name} is now ${enabled ? 'active' : 'paused'}.`);
    } catch {
      setRules((current) => current.map((item) => item.id === rule.id ? { ...item, enabled: rule.enabled } : item));
      setError('The alert change could not be saved.');
    }
  }

  async function remove(rule: AlertRule) {
    const previous = rules;
    setRules((current) => current.filter((item) => item.id !== rule.id));
    try {
      const response = await fetch(`/api/alerts?id=${encodeURIComponent(rule.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      flash(`${rule.name} was deleted.`);
    } catch {
      setRules(previous);
      setError('The alert could not be deleted.');
    }
  }

  return (
    <div className="alerts-layout">
      <section className="panel rule-builder">
        <div className="panel-head"><div><span className="panel-kicker">RULE BUILDER</span><h2>Create an alert</h2></div></div>
        <form onSubmit={addRule}>
          <label><span>Rule name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <div className="rule-sentence">
            Tell me when a token scores at least
            <strong>{score}</strong>, has
            <strong>{formatMoney(liquidity)}</strong> liquidity, and is less than
            <strong>{age < 60 ? `${age} minutes` : `${age / 60} hours`}</strong> old.
          </div>
          <label><span>Minimum MemeRadar score <b>{score}</b></span><input type="range" min="40" max="90" step="1" value={score} onChange={(event) => setScore(Number(event.target.value))} /></label>
          <label><span>Minimum liquidity</span><select value={liquidity} onChange={(event) => setLiquidity(Number(event.target.value))}><option value="10000">$10K</option><option value="25000">$25K</option><option value="50000">$50K</option><option value="75000">$75K</option><option value="100000">$100K</option></select></label>
          <label><span>Maximum token age</span><select value={age} onChange={(event) => setAge(Number(event.target.value))}><option value="30">30 minutes</option><option value="60">1 hour</option><option value="180">3 hours</option><option value="360">6 hours</option></select></label>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : '＋ Save alert rule'}</button>
          <small className="form-note">Rules persist in Supabase. Matches are evaluated whenever minute snapshots are saved.</small>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      </section>

      <section className="panel saved-rules">
        <div className="panel-head"><div><span className="panel-kicker">YOUR WATCHERS</span><h2>Saved alert rules</h2></div><span className="result-count">{rules.filter((rule) => rule.enabled).length} ACTIVE</span></div>
        <div className="rule-list">
          {loading && <div className="empty-state"><strong>Loading saved rules…</strong><span>Connecting to MemeRadar storage.</span></div>}
          {!loading && rules.map((rule) => <article className={rule.enabled ? '' : 'rule-off'} key={rule.id}>
            <button className={`toggle ${rule.enabled ? 'toggle-on' : ''}`} onClick={() => void toggle(rule)} aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`}><i /></button>
            <div><strong>{rule.name}</strong><p>Score ≥ {rule.score} · Liquidity ≥ {formatMoney(rule.liquidity)} · Age ≤ {rule.maxAge < 60 ? `${rule.maxAge}m` : `${rule.maxAge / 60}h`}</p>{rule.lastTriggeredAt && <small className="last-match">Last match {new Date(rule.lastTriggeredAt).toLocaleString()}</small>}</div>
            <span className="matches">{rule.matches}<small>matches</small></span>
            <button className="delete-button" onClick={() => void remove(rule)} aria-label={`Delete ${rule.name}`}>×</button>
          </article>)}
          {!loading && rules.length === 0 && <div className="empty-state"><strong>No rules yet</strong><span>Use the builder to create your first persistent alert.</span></div>}
        </div>
      </section>
      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    </div>
  );
}
