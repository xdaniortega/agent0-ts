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
    const result = await sdk.searchAgents(
      { keyword: 'crypto agent' },
      { pageSize: 5, semanticTopK: 10 }
    );
    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThanOrEqual(0);
  });

  it('items have agentId in chainId:tokenId format when present', async () => {
    const result = await sdk.searchAgents(
      { keyword: 'agent' },
      { pageSize: 3, semanticTopK: 5 }
    );
    for (const item of result.items) {
      expect(item.agentId).toMatch(/^\d+:\d+$/);
      expect(item.chainId).toBeDefined();
      expect(typeof item.chainId).toBe('number');
    }
  });

  it('items can have semanticScore when from semantic path', async () => {
    const result = await sdk.searchAgents(
      { keyword: 'crypto' },
      { pageSize: 5, semanticTopK: 10 }
    );
    for (const item of result.items) {
      if ((item as any).semanticScore != null) {
        expect(typeof (item as any).semanticScore).toBe('number');
        expect((item as any).semanticScore).toBeGreaterThanOrEqual(0);
        expect((item as any).semanticScore).toBeLessThanOrEqual(1);
      }
    }
  });

  it('supports cursor pagination with keyword', async () => {
    const page1 = await sdk.searchAgents(
      { keyword: 'agent' },
      { pageSize: 2, semanticTopK: 10 }
    );
    expect(page1.items.length).toBeLessThanOrEqual(2);
    if (page1.nextCursor && page1.items.length > 0) {
      const page2 = await sdk.searchAgents(
        { keyword: 'agent' },
        { pageSize: 2, semanticTopK: 10, cursor: page1.nextCursor }
      );
      expect(Array.isArray(page2.items)).toBe(true);
      const ids1 = page1.items.map((a) => a.agentId);
      const ids2 = page2.items.map((a) => a.agentId);
      const overlap = ids1.filter((id) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    }
  });
});
