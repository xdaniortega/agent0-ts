# Release Notes 1.5.6

**Release Date:** February 24, 2026

## 🎯 Overview

Version 1.5.6 adds full Arbitrum network support with The Graph subgraph integration and introduces a flexible RPC indexer as an alternative indexing backend.

## ✨ New Features

### Arbitrum Network Support

**Added Subgraph URLs:**
- ✅ **Arbitrum One (42161)** — Full subgraph support for mainnet
- ✅ **Arbitrum Sepolia (421614)** — Full subgraph support for testnet

Both networks now work with the default SDK configuration:

```typescript
const sdk = new SDK({
  chainId: 42161, // Arbitrum One
  rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
  privateKey: process.env.PRIVATE_KEY,
  // Subgraph URL auto-defaults — no additional config needed
});

// All operations work: agent search, feedback, reputation
const agents = await sdk.searchAgents({ active: true });
```

### RPC Indexer (Alternative Indexing Backend)

New optional indexer that queries blockchain events directly via `eth_getLogs`:

```typescript
const sdk = new SDK({
  chainId: 42161,
  rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
  indexer: 'rpc', // Use RPC instead of subgraph
  rpcIndexerFromBlock: 150_000_000n,
});
```

**RPC Indexer Capabilities:**
- ✅ Full feedback operations (`searchFeedback`, `giveFeedback`, `getFeedback`)
- ✅ Get agent by ID (`getAgent`, `loadAgent`)  
- ✅ On-chain metadata queries (`queryAgentMetadata`)
- ❌ Agent discovery/search (requires subgraph)

**When to use RPC Indexer:**
- Real-time data (no ~30s indexing delay)
- Local/private chains without subgraph
- Testing environments
- Feedback-only use cases

See `docs/RPC_INDEXER_LIMITATIONS.md` for detailed capabilities.

## 🏗️ Architecture Changes

### New `DataSourceClient` Interface

Introduced abstraction layer to decouple indexing backend from business logic:

```typescript
export interface DataSourceClient {
  searchAgentsV2(opts: SearchAgentsV2Options): Promise<AgentSummary[]>;
  getAgentById(agentId: string): Promise<AgentSummary | null>;
  queryFeedbacks(...): Promise<QueryFeedback[]>;
  queryAgentMetadata(...): Promise<QueryAgentMetadata[]>;
  searchFeedback(...): Promise<any[]>;
}
```

**Implementations:**
- `SubgraphClient` — The Graph queries (default)
- `RpcIndexerClient` — Direct on-chain queries via viem

### SDK Configuration Options

**New options:**
```typescript
{
  indexer?: 'subgraph' | 'rpc',
  dataSource?: DataSourceClient,
  rpcIndexerFromBlock?: bigint,
  rpcIndexerMaxBlockRange?: bigint,
}
```

## 🔄 Changes

### Contract Registry

Added Arbitrum contract addresses to `DEFAULT_SUBGRAPH_URLS`:

```typescript
export const DEFAULT_SUBGRAPH_URLS: Record<ChainId, string> = {
  // ... existing chains
  42161: 'https://gateway.thegraph.com/api/.../FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmvr1F8k',
  421614: 'https://gateway.thegraph.com/api/.../6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT',
};
```

### Terminology Updates

Renamed internal references from "subgraph" to "data source" for semantic clarity:
- `FeedbackManager.getSubgraphClientForChain` → uses `DataSourceClient`
- `AgentIndexer` constructor now accepts `DataSourceClient`
- Documentation updated throughout

## 📊 Supported Networks

| Network | Chain ID | Subgraph | RPC Indexer |
|---------|----------|----------|-------------|
| Ethereum Mainnet | 1 | ✅ | ✅ |
| **Arbitrum One** | **42161** | ✅ **New** | ✅ |
| Base Mainnet | 8453 | ✅ | ✅ |
| Polygon Mainnet | 137 | ✅ | ✅ |
| Ethereum Sepolia | 11155111 | ✅ | ✅ |
| **Arbitrum Sepolia** | **421614** | ✅ **New** | ✅ |
| Base Sepolia | 84532 | ✅ | ✅ |

All 7 networks now support both indexing backends.

## 📝 Documentation

**New Files:**
- `docs/RPC_INDEXER_LIMITATIONS.md` — Detailed RPC indexer capabilities and limitations

**Updated:**
- `README.md` — Network support table, RPC indexer examples, Arbitrum usage
- `env.example` — RPC indexer configuration examples

## 🔧 Breaking Changes

**None.** This release is fully backward compatible.

- Default behavior unchanged (subgraph indexer)
- Existing code works without modifications
- New `indexer` option is optional

## 🐛 Bug Fixes

None in this release.

## 📦 Dependencies

No dependency changes.

## 🚀 Migration Guide

### No Action Required for Existing Users

If you're already using the SDK, no changes needed. The default behavior remains the same.

### Using Arbitrum Networks

**Before (would fail):**
```typescript
const sdk = new SDK({
  chainId: 42161,
  rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
  // Would throw: no subgraph URL for chain 42161
});
```

**After (works automatically):**
```typescript
const sdk = new SDK({
  chainId: 42161,
  rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
  // Subgraph URL auto-defaults ✅
});
```

### Using RPC Indexer (Optional)

```typescript
const sdk = new SDK({
  chainId: 42161,
  rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
  indexer: 'rpc', // Opt into RPC indexer
  rpcIndexerFromBlock: 150_000_000n, // Contract deployment block
});
```

## 📖 Resources

- **Documentation:** [sdk.ag0.xyz](https://sdk.ag0.xyz)
- **GitHub:** [github.com/agent0lab/agent0-ts](https://github.com/agent0lab/agent0-ts)
- **Issues:** [Report bugs](https://github.com/agent0lab/agent0-ts/issues)
- **Telegram:** [Agent0 channel](https://t.me/agent0kitchen)
- **Email:** team@ag0.xyz

## 🙏 Acknowledgments

Thanks to the community for feedback on Arbitrum support and to The Graph team for Arbitrum subgraph deployment.

---

**Previous Releases:** See `release_notes/` folder for version history.
