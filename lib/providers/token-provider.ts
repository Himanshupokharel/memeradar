import type { Token, TokenSnapshot } from '../types';

/** The UI depends on this contract, not on a specific external service. */
export interface TokenProvider {
  getSnapshot(): Promise<TokenSnapshot>;
  getTokens(): Promise<Token[]>;
  getToken(id: string): Promise<Token | undefined>;
}
