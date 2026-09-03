'use client';

import { FormEvent, useState } from 'react';
import { initialAlertRules } from '@/lib/mock-data';
import type { AlertRule } from '@/lib/types';
import { formatMoney } from './TokenPrimitives';

export function AlertsManager() {
  const [rules, setRules] = useState(initialAlertRules);
  const [name, setName] = useState('My signal rule');
  const [score, setScore] = useState(75);
  const [liquidity, setLiquidity] = useState(50000);
  const [age, setAge] = useState(60);
  const [notice, setNotice] = useState('');

  function addRule(event: FormEvent) {
    event.preventDefault();
    const rule: AlertRule = { id: `rule-${Date.now()}`, name: name || 'Untitled rule', score, liquidity, maxAge: age, enabled: true, matches: 0 };
    setRules((current) => [rule, ...current]);
    setNotice(`“${rule.name}” is now watching the mock feed.`);
    setTimeout(() => setNotice(''), 3500);
  }

  function toggle(id: string) {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
  }

  function remove(id: string) {
    setRules((current) => current.filter((rule) => rule.id !== id));
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
          <button className="primary-button" type="submit">＋ Save alert rule</button>
          <small className="form-note">V1 alerts stay in this browser session. Notifications are simulated.</small>
        </form>
      </section>

      <section className="panel saved-rules">
        <div className="panel-head"><div><span className="panel-kicker">YOUR WATCHERS</span><h2>Saved alert rules</h2></div><span className="result-count">{rules.filter((rule) => rule.enabled).length} ACTIVE</span></div>
        <div className="rule-list">
          {rules.map((rule) => <article className={rule.enabled ? '' : 'rule-off'} key={rule.id}>
            <button className={`toggle ${rule.enabled ? 'toggle-on' : ''}`} onClick={() => toggle(rule.id)} aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`}><i /></button>
            <div><strong>{rule.name}</strong><p>Score ≥ {rule.score} · Liquidity ≥ {formatMoney(rule.liquidity)} · Age ≤ {rule.maxAge < 60 ? `${rule.maxAge}m` : `${rule.maxAge / 60}h`}</p></div>
            <span className="matches">{rule.matches}<small>matches</small></span>
            <button className="delete-button" onClick={() => remove(rule.id)} aria-label={`Delete ${rule.name}`}>×</button>
          </article>)}
          {rules.length === 0 && <div className="empty-state"><strong>No rules yet</strong><span>Use the builder to create your first alert.</span></div>}
        </div>
      </section>
      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    </div>
  );
}
