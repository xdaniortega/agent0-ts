/**
 * Unit tests for SemanticSearchClient.
 * Uses mocked fetch; no network required.
 */

import { SemanticSearchClient } from '../src/core/semantic-search-client.js';

const MOCK_BASE = 'https://mock-search.example.com';

describe('SemanticSearchClient', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('constructor', () => {
    it('uses default baseUrl when not provided', () => {
      const client = new SemanticSearchClient();
      expect((client as any).baseUrl).toBe('https://semantic-search.ag0.xyz');
    });

    it('uses provided baseUrl', () => {
      const client = new SemanticSearchClient(MOCK_BASE);
      expect((client as any).baseUrl).toBe(MOCK_BASE);
    });

  });

  describe('search', () => {
    it('returns empty array for empty query', async () => {
      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('');
      expect(results).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns empty array for whitespace-only query', async () => {
      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('   ');
      expect(results).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends POST to /api/v1/search with query in body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      await client.search('crypto agent');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `${MOCK_BASE}/api/v1/search`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'crypto agent' }),
        })
      );
    });

    it('trims query before sending', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      await client.search('  crypto agent  ');

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ query: 'crypto agent' }),
        })
      );
    });

    it('includes limit in body when topK is provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      await client.search('agent', { topK: 10 });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ query: 'agent', limit: 10 }),
        })
      );
    });

    it('includes minScore in body when provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      await client.search('agent', { minScore: 0.5 });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ query: 'agent', minScore: 0.5 }),
        })
      );
    });

    it('includes both limit and minScore when provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      await client.search('agent', { topK: 5, minScore: 0.7 });

      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call[1].body as string);
      expect(body).toMatchObject({ query: 'agent', limit: 5, minScore: 0.7 });
    });

    it('parses valid results and returns SemanticSearchResult[]', async () => {
      const raw = [
        { chainId: 1, agentId: '1:20743', score: 0.7053 },
        { chainId: 11155111, agentId: '11155111:374', score: 0.82 },
      ];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: raw }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('agent');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ chainId: 1, agentId: '1:20743', score: 0.7053 });
      expect(results[1]).toEqual({ chainId: 11155111, agentId: '11155111:374', score: 0.82 });
    });

    it('accepts response as array (no .results wrapper)', async () => {
      const raw = [{ chainId: 1, agentId: '1:123', score: 0.9 }];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => raw,
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('x');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ chainId: 1, agentId: '1:123', score: 0.9 });
    });

    it('filters out results without colon in agentId', async () => {
      const raw = [
        { chainId: 1, agentId: '1:20743', score: 0.7 },
        { chainId: 1, agentId: '20743', score: 0.6 }, // no colon
      ];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: raw }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('agent');

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('1:20743');
    });

    it('filters out results with invalid chainId or score', async () => {
      const raw = [
        { chainId: 1, agentId: '1:1', score: 0.5 },
        { chainId: NaN, agentId: '1:2', score: 0.5 },
        { chainId: 1, agentId: '1:3', score: NaN },
      ];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: raw }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('agent');

      expect(results).toHaveLength(1);
      expect(results[0].agentId).toBe('1:1');
    });

    it('coerces chainId and score to number', async () => {
      const raw = [{ chainId: '1', agentId: '1:123', score: '0.85' }];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: raw }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('x');

      expect(results[0].chainId).toBe(1);
      expect(results[0].score).toBe(0.85);
    });

    it('throws on HTTP !ok', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      await expect(client.search('agent')).rejects.toThrow('Semantic search failed: HTTP 500');
    });

    it('throws on 404', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      await expect(client.search('agent')).rejects.toThrow('HTTP 404');
    });

    it('returns empty array when response has no results key and is not array', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('x');

      expect(results).toEqual([]);
    });

    it('uses AbortSignal.timeout for request timeout', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      await client.search('agent');

      const call = fetchMock.mock.calls[0][1];
      expect(call.signal).toBeDefined();
      expect(call.signal).toBeInstanceOf(AbortSignal);
    });

    it('skips non-object items in results array', async () => {
      const raw = [
        { chainId: 1, agentId: '1:1', score: 0.5 },
        null,
        undefined,
        'string',
        42,
        { chainId: 2, agentId: '2:2', score: 0.6 },
      ];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: raw }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('x');

      expect(results).toHaveLength(2);
      expect(results[0].agentId).toBe('1:1');
      expect(results[1].agentId).toBe('2:2');
    });

    it('handles empty results array', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      const client = new SemanticSearchClient(MOCK_BASE);
      const results = await client.search('nonexistent query');

      expect(results).toEqual([]);
    });
  });
});
