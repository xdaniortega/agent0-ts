import { TIMEOUTS } from '../utils/constants.js';

export type SemanticSearchResult = {
  chainId: number;
  agentId: string;
  score: number;
};

export interface SemanticSearchOptions {
  minScore?: number;
  topK?: number;
}

/**
 * Thin client for the external semantic-search endpoint.
 *
 * NOTE: Per requirement, we do not use semantic backend filtering; only `query`, `minScore`, `topK`.
 */
export class SemanticSearchClient {
  constructor(
    private readonly baseUrl: string = 'https://semantic-search.ag0.xyz'
  ) {}

  async search(query: string, opts: SemanticSearchOptions = {}): Promise<SemanticSearchResult[]> {
    if (!query || !query.trim()) return [];

    const body: Record<string, unknown> = { query: query.trim() };
    if (opts.minScore !== undefined) body.minScore = opts.minScore;
    // API expects "limit" not "topK" (semantic-search.ag0.xyz v1)
    if (opts.topK !== undefined) body.limit = opts.topK;

    const res = await fetch(`${this.baseUrl}/api/v1/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUTS.SEMANTIC_SEARCH),
    });

    if (!res.ok) {
      throw new Error(`Semantic search failed: HTTP ${res.status}`);
    }

    const json: any = await res.json();
    const raw: any[] = Array.isArray(json?.results) ? json.results : Array.isArray(json) ? json : [];
    const results = raw.filter((r) => r != null && typeof r === 'object');

    return results
      .map((r) => ({
        chainId: Number(r.chainId),
        agentId: String(r.agentId),
        score: Number(r.score),
      }))
      .filter((r) => Number.isFinite(r.chainId) && r.agentId.includes(':') && Number.isFinite(r.score));
  }
}

