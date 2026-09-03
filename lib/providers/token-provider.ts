import type { Token } from '../types';

/** The UI depends on this contract, not on a specific external service. */
export interface TokenProvider {
  getTokens(): Promise<Token[]>;
  getToken(id: string): Promise<Token | undefined>;
}
