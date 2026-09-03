import type { Token } from '../types';
import type { TokenProvider } from './token-provider';

/**
 * Blueprint for the live-data phase. Keep secrets on the server, normalize
 * provider responses here, and return the same Token shape the UI already uses.
 */
export function createLiveTokenProvider(config: { dexScreenerBaseUrl: string; heliusApiKey: string }): TokenProvider {
  async function loadTokens(): Promise<Token[]> {
    void config;
    throw new Error('Live provider is a V2 integration. Use mockTokenProvider for V1.');
  }

  return {
    async getSnapshot() {
      return { tokens: await loadTokens(), source: 'dexscreener', updatedAt: new Date().toISOString() };
    },
    getTokens: loadTokens,
    async getToken(id) {
      return (await loadTokens()).find((token) => token.id === id);
    },
  };
}
