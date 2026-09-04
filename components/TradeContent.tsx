'use client';

import { useEffect, useState } from 'react';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';
import type { Token } from '@/lib/types';
import { formatAge, formatMoney, RiskFlags, ScoreBadge, TokenLogo } from './TokenPrimitives';
import { useLiveMarket } from './LiveMarketProvider';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const PLUGIN_URL = 'https://plugin.jup.ag/plugin-v1.js';

type JupiterPlugin = {
  init(options: {
    displayMode: 'integrated';
    integratedTargetId: string;
    autoConnect: boolean;
    defaultExplorer: 'Solscan';
    containerStyles: Record<string, string>;
    formProps: {
      swapMode: 'ExactIn';
      initialInputMint: string;
      initialOutputMint: string;
      fixedMint: string;
    };
    onSuccess(details: { txid: string }): void;
    onSwapError(): void;
  }): void;
  close?(): void;
};

declare global {
  interface Window { Jupiter?: JupiterPlugin }
}

let pluginPromise: Promise<JupiterPlugin> | undefined;

function loadPlugin() {
  if (window.Jupiter) return Promise.resolve(window.Jupiter);
  if (pluginPromise) return pluginPromise;
  pluginPromise = new Promise<JupiterPlugin>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PLUGIN_URL}"]`);
    const script = existing || document.createElement('script');
    const timer = window.setTimeout(() => reject(new Error('Jupiter took too long to load')), 15_000);
    const ready = () => {
      window.clearTimeout(timer);
      if (window.Jupiter) resolve(window.Jupiter);
      else reject(new Error('Jupiter did not initialize'));
    };
    script.addEventListener('load', ready, { once: true });
    script.addEventListener('error', () => {
      window.clearTimeout(timer);
      reject(new Error('Jupiter could not be loaded'));
    }, { once: true });
    if (!existing) {
      script.src = PLUGIN_URL;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return pluginPromise;
}

export function TradeContent({ mint, side }: { mint: string; side: 'buy' | 'sell' }) {
  const { snapshot } = useLiveMarket();
  const [directToken, setDirectToken] = useState<Token>();
  const [pluginState, setPluginState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [swapError, setSwapError] = useState('');
  const [successTx, setSuccessTx] = useState('');
  const token = snapshot.tokens.find((candidate) => candidate.id === mint) || directToken;
  const validMint = MINT_PATTERN.test(mint);

  useEffect(() => {
    if (token || !validMint) return;
    let active = true;
    void tokenProvider.getToken(mint).then((result) => { if (active) setDirectToken(result); });
    return () => { active = false; };
  }, [mint, token, validMint]);

  useEffect(() => {
    if (!validMint) return;
    let active = true;
    void loadPlugin().then((plugin) => {
      if (!active) return;
      plugin.init({
        displayMode: 'integrated',
        integratedTargetId: 'jupiter-plugin',
        autoConnect: false,
        defaultExplorer: 'Solscan',
        containerStyles: { width: '100%', height: '100%', minHeight: '570px', borderRadius: '12px', overflow: 'hidden' },
        formProps: {
          swapMode: 'ExactIn',
          initialInputMint: side === 'buy' ? SOL_MINT : mint,
          initialOutputMint: side === 'buy' ? mint : SOL_MINT,
          fixedMint: mint,
        },
        onSuccess: ({ txid }) => {
          setSwapError('');
          setSuccessTx(txid);
        },
        onSwapError: () => {
          setSuccessTx('');
          setSwapError('The swap was not completed. Review the wallet message and request a fresh quote before trying again.');
        },
      });
      setPluginState('ready');
    }).catch(() => {
      if (active) {
        setPluginState('error');
        setSwapError('Jupiter is temporarily unavailable. No transaction was created or signed.');
      }
    });
    return () => { active = false; };
  }, [mint, side, validMint]);

  const visibleError = validMint ? swapError : 'This token address is not valid. Return to a live token page and try again.';

  return <>
    <a className="back-link" href={`/token/${mint}`}>← Back to token research</a>
    <div className="trade-heading">
      <div><span className="eyebrow">NON-CUSTODIAL · WALLET APPROVAL REQUIRED</span><h1>{side === 'buy' ? 'Buy' : 'Sell'} {token?.symbol || 'token'}</h1><p>Review a live Jupiter route, connect your own wallet, and approve the transaction inside that wallet.</p></div>
      <div className="trade-side-tabs" aria-label="Trade direction"><a className={side === 'buy' ? 'active' : ''} href={`/trade/${mint}?side=buy`}>Buy</a><a className={side === 'sell' ? 'active sell' : ''} href={`/trade/${mint}?side=sell`}>Sell</a></div>
    </div>

    <div className="trade-layout">
      <aside className="trade-research">
        <section className="panel trade-token-card">
          <span className="panel-kicker">TOKEN BEING TRADED</span>
          <div className="trade-token-title"><TokenLogo symbol={token?.symbol || '?'} color={token?.color || '#55e6a5'} imageUrl={token?.imageUrl} large /><div><strong>{token?.name || 'Loading token details…'}</strong><span>{token?.symbol || `${mint.slice(0, 6)}…${mint.slice(-4)}`}</span></div>{token && <ScoreBadge score={token.score} />}</div>
          {token && <div className="trade-facts"><div><span>Price</span><b>${token.price < 0.0001 ? token.price.toPrecision(4) : token.price.toFixed(6)}</b></div><div><span>Liquidity</span><b>{formatMoney(token.liquidity)}</b></div><div><span>Pair age</span><b>{formatAge(token.ageMinutes)}</b></div></div>}
          {token && <RiskFlags risks={token.risks.slice(0, 3)} />}
          <code title={mint}>{mint}</code>
        </section>

        <section className="trade-safety panel">
          <span className="panel-kicker">BEFORE YOU APPROVE</span>
          <ol><li>Confirm the token address in the wallet matches this page.</li><li>Read the estimated output, route, fees, and price impact.</li><li>Reject the request if the wallet shows an unexpected permission or amount.</li></ol>
          <p>MemeRadar never asks for or stores a seed phrase, private key, or wallet password.</p>
        </section>
      </aside>

      <section className="panel trade-terminal">
        <div className="panel-head"><div><span className="panel-kicker">JUPITER SWAP</span><h2>{side === 'buy' ? 'SOL → token' : 'Token → SOL'}</h2></div><span className="result-count">MAINNET</span></div>
        {pluginState === 'loading' && <div className="trade-loading"><span className="live-dot" /><strong>Loading secure wallet connection…</strong><small>No wallet action will happen automatically.</small></div>}
        <div id="jupiter-plugin" className={pluginState === 'ready' ? 'plugin-ready' : ''} />
        {visibleError && <div className="trade-message trade-error">{visibleError}</div>}
        {successTx && <div className="trade-message trade-success"><strong>Swap confirmed.</strong><a href={`https://solscan.io/tx/${successTx}`} target="_blank" rel="noreferrer">View transaction on Solscan ↗</a></div>}
      </section>
    </div>
    <p className="disclaimer">Jupiter supplies the wallet connection, route, quote, and swap execution. MemeRadar adds no trading fee and does not control transaction approval. Token signals remain informational and do not predict returns.</p>
  </>;
}
