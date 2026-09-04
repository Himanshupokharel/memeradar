'use client';

import { useMemo, useState } from 'react';
import type { Token } from '@/lib/types';
import { formatAge, formatMoney, PercentileBadge, PressureBar, RiskFlags, ScoreBadge, Sparkline, TokenLogo } from './TokenPrimitives';
import { useLiveMarket } from './LiveMarketProvider';

type SortKey = 'score' | 'ageMinutes' | 'volume5m' | 'liquidity';

export function TokenTable({ data, title, kicker, initialQuery = '', compact = false, mode = 'all' }: { data: Token[]; title?: string; kicker?: string; initialQuery?: string; compact?: boolean; mode?: 'all' | 'newest' | 'trending' }) {
  const { snapshot, status } = useLiveMarket();
  const [query, setQuery] = useState(initialQuery);
  const [score, setScore] = useState('all');
  const [liquidity, setLiquidity] = useState('all');
  const [age, setAge] = useState('all');
  const [rank, setRank] = useState('all');
  const [sort, setSort] = useState<SortKey>('score');

  const sourceData = status === 'live' ? snapshot.tokens : data;
  const filtered = useMemo(() => sourceData
    .filter((token) => mode !== 'trending' || token.score >= 55)
    .filter((token) => `${token.name} ${token.symbol} ${token.contract}`.toLowerCase().includes(query.toLowerCase()))
    .filter((token) => score === 'all' || token.score >= Number(score))
    .filter((token) => liquidity === 'all' || token.liquidity >= Number(liquidity))
    .filter((token) => age === 'all' || token.ageMinutes <= Number(age))
    .filter((token) => rank === 'all' || (token.relativeRank?.overall || 0) >= Number(rank))
    .sort((a, b) => mode === 'newest' ? a.ageMinutes - b.ageMinutes : sort === 'ageMinutes' ? a.ageMinutes - b.ageMinutes : b[sort] - a[sort]), [sourceData, mode, query, score, liquidity, age, rank, sort]);

  return (
    <section className="panel token-panel">
      {(title || !compact) && <div className="panel-head">
        <div>{kicker && <span className="panel-kicker">{kicker}</span>}{title && <h2>{title}</h2>}</div>
        {!compact && <span className="result-count">{filtered.length} TOKENS</span>}
      </div>}
      {!compact && <div className="filterbar">
        <label className="filter-search">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by token or address" aria-label="Filter token list" /></label>
        <label><span>Score</span><select value={score} onChange={(event) => setScore(event.target.value)}><option value="all">Any score</option><option value="70">70+</option><option value="80">80+</option></select></label>
        <label><span>Liquidity</span><select value={liquidity} onChange={(event) => setLiquidity(event.target.value)}><option value="all">Any liquidity</option><option value="25000">$25K+</option><option value="50000">$50K+</option><option value="100000">$100K+</option></select></label>
        <label><span>Age</span><select value={age} onChange={(event) => setAge(event.target.value)}><option value="all">Any age</option><option value="30">Under 30m</option><option value="60">Under 1h</option><option value="180">Under 3h</option></select></label>
        <label><span>Relative rank</span><select value={rank} onChange={(event) => setRank(event.target.value)}><option value="all">Any rank</option><option value="80">Top 20%</option><option value="90">Top 10%</option></select></label>
        <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="score">Top score</option><option value="ageMinutes">Newest</option><option value="volume5m">5m volume</option><option value="liquidity">Liquidity</option></select></label>
        <button className="clear-button" onClick={() => { setQuery(''); setScore('all'); setLiquidity('all'); setAge('all'); setRank('all'); setSort('score'); }}>Reset</button>
      </div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Token</th><th>MR score</th><th>Relative rank</th><th>Market cap</th><th>Liquidity</th><th>5m volume</th><th>Age</th><th>Buy pressure</th><th title="Uses saved price, volume, participation, and liquidity observations when available">Momentum</th><th>Risk flags</th><th>Trade</th></tr></thead>
          <tbody>{filtered.map((token) => (
            <tr key={token.id}>
              <td><a className="token-cell" href={`/token/${token.id}`}><TokenLogo symbol={token.symbol} color={token.color} imageUrl={token.imageUrl} /><span><b>{token.symbol}</b><small>{token.name} · {token.contract}</small></span></a></td>
              <td><ScoreBadge score={token.score} /></td>
              <td><PercentileBadge rank={token.relativeRank} /></td>
              <td>{formatMoney(token.marketCap)}</td><td>{formatMoney(token.liquidity)}</td><td>{formatMoney(token.volume5m)}</td><td>{formatAge(token.ageMinutes)}</td>
              <td><PressureBar value={token.buyPressure} /></td>
              <td><div className="momentum-cell"><Sparkline values={token.sparkline} tone={token.advancedMomentum?.status === 'cooling' || (!token.advancedMomentum && token.priceChange5m < 0) ? 'red' : 'green'} /><small className={`momentum-${token.advancedMomentum?.status || 'collecting'}`}>{token.advancedMomentum?.status || 'collecting'}</small></div></td>
              <td><RiskFlags risks={token.risks.slice(0, 1)} compact /></td>
              <td><div className="table-trade-actions"><a className="table-buy" href={`/trade/${token.id}?side=buy`}>Buy</a><a className="table-sell" href={`/trade/${token.id}?side=sell`}>Sell</a></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="empty-state"><strong>No tokens match those filters</strong><span>Try lowering the score or liquidity requirement.</span></div>}
      {!compact && <p className="table-note">Advanced momentum uses saved observations when at least three points exist. “Collecting” means there is not enough history yet; the signal is informational and not a return forecast.</p>}
    </section>
  );
}
