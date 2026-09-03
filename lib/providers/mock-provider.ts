import { tokens } from '../mock-data';
import type { TokenProvider } from './token-provider';

export const mockTokenProvider: TokenProvider = {
  async getSnapshot() {
    return { tokens, source: 'mock', updatedAt: new Date().toISOString(), notice: 'Live provider unavailable. Showing fallback demo data.' };
  },
  async getTokens() {
    return tokens;
  },
  async getToken(id) {
    return tokens.find((token) => token.id === id);
  },
};
