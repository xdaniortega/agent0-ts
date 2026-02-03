/**
 * Multi-chain search tests (STRICT).
 *
 * These tests are intended to catch blocking regressions (bad chain config, broken cursor merge, etc).
 * They are LIVE network tests, so they run only when explicitly enabled.
 *
 * Enable with: RUN_LIVE_TESTS=1
 */
import { describe, expect, it } from '@jest/globals';

import { SDK } from '../src/index.js';
import { DEFAULT_SUBGRAPH_URLS } from '../src/core/contracts.js';
import { CHAIN_ID, RPC_URL, printConfig } from './config.js';

const RUN_LIVE_TESTS = process.env.RUN_LIVE_TESTS === '1';
const describeMaybe = RUN_LIVE_TESTS ? describe : describe.skip;

// Only test chains that are actually configured out-of-the-box.
const CONFIGURED_CHAINS = Object.keys(DEFAULT_SUBGRAPH_URLS).map((k) => Number(k));

describeMaybe('Multi-Chain (live) - strict', () => {
  let sdk: SDK;

  beforeAll(() => {
    printConfig();
    sdk = new SDK({ chainId: CHAIN_ID, rpcUrl: RPC_URL });
  });

  it('searchAgents works per configured chain (does not throw; validates chainId if any results)', async () => {
    expect(CONFIGURED_CHAINS.length).toBeGreaterThan(0);
    for (const chainId of CONFIGURED_CHAINS) {
      const r = await sdk.searchAgents({ chains: [chainId] }, { pageSize: 1, sort: [] });
      expect(Array.isArray(r.items)).toBe(true);
      if (r.items.length > 0) expect(r.items[0].chainId).toBe(chainId);
    }
  });

  it('getAgent works across configured chains when at least one agent is returned (chainId:agentId form)', async () => {
    for (const chainId of CONFIGURED_CHAINS) {
      const r = await sdk.searchAgents({ chains: [chainId] }, { pageSize: 1, sort: [] });
      if (r.items.length === 0) continue;

      const agentId = r.items[0].agentId;
      const tokenId = agentId.includes(':') ? agentId.split(':').pop()! : agentId;
      const full = `${chainId}:${tokenId}`;

      const agent = await sdk.getAgent(full);
      expect(agent).toBeTruthy();
      expect(agent?.chainId).toBe(chainId);
    }
  });

  it('multi-chain cursor pagination advances without duplicates', async () => {
    if (CONFIGURED_CHAINS.length < 2) {
      // Still validate cursor behavior in multi-chain mode with the available set.
      // (But the strongest signal is when >=2 chains are configured.)
      console.warn(`Only ${CONFIGURED_CHAINS.length} configured chain(s); multi-chain merge coverage is limited.`);
    }

    const page1 = await sdk.searchAgents({ chains: CONFIGURED_CHAINS }, { pageSize: 5, sort: [] });
    expect(page1.items.length).toBeGreaterThan(0);

    if (!page1.nextCursor) return;

    const page2 = await sdk.searchAgents({ chains: CONFIGURED_CHAINS }, { pageSize: 5, sort: [], cursor: page1.nextCursor });
    const ids1 = new Set(page1.items.map((a) => a.agentId));
    const dupes = page2.items.filter((a) => ids1.has(a.agentId));
    expect(dupes.length).toBe(0);
  });

  it('feedback.hasFeedback query does not error (and results, if any, have feedbackCount > 0)', async () => {
    const r = await sdk.searchAgents({ chains: CONFIGURED_CHAINS, feedback: { hasFeedback: true } }, { pageSize: 5, sort: [] });
    for (const a of r.items) {
      if (typeof a.feedbackCount === 'number') expect(a.feedbackCount).toBeGreaterThan(0);
    }
  });
});

