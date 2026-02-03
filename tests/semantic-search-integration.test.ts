/**
 * Integration tests for SemanticSearchClient against live endpoint.
 * Run with: RUN_LIVE_TESTS=1 npm test -- semantic-search-integration
 * Or: SEMANTIC_SEARCH_LIVE=1 npm test -- semantic-search-integration
 */

import { SemanticSearchClient } from '../src/core/semantic-search-client.js';

const RUN_LIVE = process.env.RUN_LIVE_TESTS === '1' || process.env.SEMANTIC_SEARCH_LIVE === '1';
const describeMaybe = RUN_LIVE ? describe : describe.skip;

describeMaybe('SemanticSearchClient (live)', () => {
  const baseUrl = process.env.SEMANTIC_SEARCH_URL || 'https://semantic-search.ag0.xyz';
  let client: SemanticSearchClient;

  beforeAll(() => {
    client = new SemanticSearchClient(baseUrl);
  });

  it('returns results for a non-empty query', async () => {
    const results = await client.search('crypto agent', { topK: 5 });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('each result has chainId, agentId (chainId:tokenId), and score', async () => {
    const results = await client.search('agent', { topK: 3 });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(typeof r.chainId).toBe('number');
      expect(Number.isFinite(r.chainId)).toBe(true);
      expect(typeof r.agentId).toBe('string');
      expect(r.agentId).toMatch(/^\d+:\d+$/);
      expect(typeof r.score).toBe('number');
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('respects topK limit', async () => {
    const results = await client.search('agent', { topK: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('single query returns valid structure (avoids rate limit)', async () => {
    const results = await client.search('assistant', { topK: 2 });
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0].agentId).toMatch(/^\d+:\d+$/);
      expect(typeof results[0].score).toBe('number');
    }
  });
});
