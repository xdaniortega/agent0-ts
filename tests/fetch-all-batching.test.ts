import { describe, expect, it } from '@jest/globals';

import { AgentIndexer } from '../src/core/indexer.js';
import type { AgentSummary } from '../src/models/interfaces.js';

function makeAgent(i: number): AgentSummary {
  return {
    chainId: 1,
    agentId: `1:${i}`,
    name: `agent-${i}`,
    description: '',
    owners: [],
    operators: [],
    supportedTrusts: [],
    a2aSkills: [],
    mcpTools: [],
    mcpPrompts: [],
    mcpResources: [],
    oasfSkills: [],
    oasfDomains: [],
    active: true,
    x402support: false,
    updatedAt: 10_000 - i,
    extras: {},
  };
}

describe('searchAgents fetch-all batching (unit)', () => {
  it('fetches multiple subgraph pages until exhaustion', async () => {
    const calls: Array<{ first: number; skip: number }> = [];

    const page1 = Array.from({ length: 1000 }, (_, i) => makeAgent(i));
    const page2 = Array.from({ length: 10 }, (_, i) => makeAgent(1000 + i));

    const subgraphClientStub = {
      searchAgentsV2: async (args: { first: number; skip: number }) => {
        calls.push({ first: args.first, skip: args.skip });
        if (args.skip === 0) return page1;
        if (args.skip === 1000) return page2;
        return [];
      },
    } as any;

    const idx = new AgentIndexer(subgraphClientStub, undefined, 1 as any);
    const results = await idx.searchAgents({}, { sort: ['updatedAt:desc'] });

    expect(results).toHaveLength(1010);
    expect(calls.map((c) => c.skip)).toEqual([0, 1000]);
    expect(calls.map((c) => c.first)).toEqual([1000, 1000]);
  });
});

