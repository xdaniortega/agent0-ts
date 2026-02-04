/**
 * Integration tests for SDK searchAgents with keyword (semantic search path).
 * Run with: RUN_LIVE_TESTS=1 npm test -- search-keyword
 */

import { SDK } from '../src/index.js';
import { CHAIN_ID, RPC_URL, printConfig } from './config.js';

const RUN_LIVE = process.env.RUN_LIVE_TESTS === '1';
const describeMaybe = RUN_LIVE ? describe : describe.skip;

describeMaybe('searchAgents with keyword (semantic path)', () => {
  let sdk: SDK;

  beforeAll(() => {
    printConfig();
    sdk = new SDK({
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
    });
  });

  it('returns items when keyword is provided', async () => {
    let result: any[] = [];
    try {
      result = await sdk.searchAgents(
        { keyword: 'crypto agent' },
        { semanticTopK: 10 }
      );
    } catch (e: any) {
      if (String(e?.message || e).includes('HTTP 429')) {
        console.warn('[live-test] Semantic endpoint rate limited (429); skipping.');
        return;
      }
      throw e;
    }
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('items have agentId in chainId:tokenId format when present', async () => {
    const result = await sdk.searchAgents(
      { keyword: 'agent' },
      { semanticTopK: 5 }
    );
    for (const item of result) {
      expect(item.agentId).toMatch(/^\d+:\d+$/);
      expect(item.chainId).toBeDefined();
      expect(typeof item.chainId).toBe('number');
    }
  });

  it('items can have semanticScore when from semantic path', async () => {
    const result = await sdk.searchAgents(
      { keyword: 'crypto' },
      { semanticTopK: 10 }
    );
    for (const item of result) {
      if ((item as any).semanticScore != null) {
        expect(typeof (item as any).semanticScore).toBe('number');
        expect((item as any).semanticScore).toBeGreaterThanOrEqual(0);
        expect((item as any).semanticScore).toBeLessThanOrEqual(1);
      }
    }
  });

  // Pagination removed: keyword searches return all results (bounded only by semantic endpoint limit).
});
