/**
 * Complex mainnet fixture test for unified searchAgents() (LIVE, strict).
 *
 * This test is intentionally hard-coded against stable mainnet data so it can exercise:
 * - agent-level filters (name/endpoints/owner/wallet)
 * - feedback filters (tag1+tag2+endpoint substring + minValue + minCount)
 * - sorting by computed averageValue
 *
 * Enable with: RUN_LIVE_TESTS=1
 */
import { describe, expect, it } from '@jest/globals';

import { SDK } from '../src/index.js';
import { RPC_URL } from './config.js';

const RUN_LIVE_TESTS = process.env.RUN_LIVE_TESTS === '1';
const describeMaybe = RUN_LIVE_TESTS ? describe : describe.skip;

// Mainnet fixture (verified via direct subgraph queries on 2026-02-02).
const FIXTURE = {
  chainId: 1,
  agentId: '1:13445',
  nameContains: 'Gekko',
  owner: '0xcc28cee3a1433493de119efe8cd218ff7c0e4821',
  feedback: {
    tag1: 'starred',
    tag2: 'token_analysis',
    endpointContains: 'gekkoterminal',
    minValue: 100,
    minCount: 2,
  },
} as const;

describeMaybe('Unified searchAgents - mainnet complex fixture (live)', () => {
  it('finds the fixture agent using combined agent + feedback filters', async () => {
    // rpcUrl is unused for subgraph-only reads in this test, but SDK requires it.
    const sdk = new SDK({ chainId: 11155111 as any, rpcUrl: RPC_URL });

    const results = await sdk.searchAgents(
      {
        chains: [FIXTURE.chainId],
        name: FIXTURE.nameContains,
        owners: [FIXTURE.owner],
        walletAddress: FIXTURE.owner,
        hasRegistrationFile: true,
        hasEndpoints: true,
        hasMCP: true,
        hasA2A: true,
        hasWeb: true,
        mcpContains: FIXTURE.feedback.endpointContains,
        a2aContains: 'agent-card.json',
        webContains: FIXTURE.feedback.endpointContains,
        feedback: {
          includeRevoked: false,
          tag1: FIXTURE.feedback.tag1,
          tag2: FIXTURE.feedback.tag2,
          endpoint: FIXTURE.feedback.endpointContains,
          minValue: FIXTURE.feedback.minValue,
          minCount: FIXTURE.feedback.minCount,
        },
      },
      { sort: ['averageValue:desc'] }
    );

    const ids = results.map((a) => a.agentId);
    expect(ids).toContain(FIXTURE.agentId);

    const agent = results.find((a) => a.agentId === FIXTURE.agentId)!;
    expect(agent.chainId).toBe(FIXTURE.chainId);

    // Endpoint semantics (strings)
    expect(typeof agent.mcp).toBe('string');
    expect(typeof agent.a2a).toBe('string');
    expect(typeof agent.web).toBe('string');

    // Reputation fields (computed in unified feedback prefilter)
    expect(typeof agent.averageValue).toBe('number');
    expect((agent.averageValue as number) >= FIXTURE.feedback.minValue).toBe(true);
    expect(typeof agent.feedbackCount).toBe('number');
    expect((agent.feedbackCount as number) > 0).toBe(true);
  });
});

