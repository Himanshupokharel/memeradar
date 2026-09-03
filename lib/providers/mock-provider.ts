import { tokens } from '../mock-data';
import type { TokenProvider } from './token-provider';

export const mockTokenProvider: TokenProvider = {
  async getTokens() {
    return tokens;
  },
  async getToken(id) {
    return tokens.find((token) => token.id === id);
  },
};

// Swap this export for a DEX Screener/Helius-backed provider later.
export const tokenProvider = mockTokenProvider;
