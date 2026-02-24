# Agent0 SDK - Alternative Indexing Fork

Agent0 is the TypeScript SDK for agentic economies. It enables agents to register, advertise their capabilities and how to communicate with them, and give each other feedback and reputation signals. All this using blockchain infrastructure (ERC-8004) and decentralized storage, enabling permissionless discovery without relying on proprietary catalogues or intermediaries.

🌐 **Supported Networks:** Ethereum • Arbitrum • Base • Polygon | (Mainnet + Testnets)  
⚡ **Dual Indexing:** The Graph Subgraph *or* Direct RPC (works without subgraph)  
🔗 **Cross-chain:** Unified agent IDs, multi-chain search, and reputation aggregation

---

Agent0 enables agents to register, advertise their capabilities and how to communicate with them, and give each other feedback and reputation signals. All this using blockchain infrastructure (ERC-8004) and decentralized storage, enabling permissionless discovery without relying on proprietary catalogues or intermediaries.

## What Does Agent0 SDK Do?

Agent0 SDK enables you to:

- **Create and manage agent identities** - Register your AI agent on-chain with a unique identity, configure presentation fields (name, description, image), set wallet addresses, and manage trust models with x402 support
- **Advertise agent capabilities** - Publish MCP and A2A endpoints, with automated extraction of MCP tools and A2A skills from endpoints
- **OASF taxonomies** - Advertise standardized skills and domains using the Open Agentic Schema Framework (OASF) taxonomies for better discovery and interoperability
- **Enable permissionless discovery** - Make your agent discoverable by other agents and platforms using rich search by attributes, capabilities, skills, tools, tasks, and x402 support
- **Build reputation** - Give and receive feedback, retrieve feedback history, and search agents by reputation with cryptographic authentication
- **Cross-chain registration** - One-line registration with IPFS nodes, Pinata, Filecoin, or HTTP URIs
- **Flexible indexing** - Use The Graph subgraph (default) *or* direct RPC queries (works without subgraph)

## Supported Networks

| Network | Chain ID | Mainnet/Testnet | Subgraph | RPC Indexer |
|---------|----------|-----------------|----------|-------------|
| **Ethereum Mainnet** | `1` | Mainnet | ✅ | ✅ |
| **Arbitrum One** | `42161` | Mainnet | ❌ Not available | ✅ **Required** |
| **Base Mainnet** | `8453` | Mainnet | ✅ | ✅ |
| **Polygon Mainnet** | `137` | Mainnet | ✅ | ✅ |
| **Ethereum Sepolia** | `11155111` | Testnet | ✅ | ✅ |
| **Arbitrum Sepolia** | `421614` | Testnet | ✅ | ✅ |
| **Base Sepolia** | `84532` | Testnet | ✅ | ✅ |

**✅ Available** | **❌ Not Available** | **⚠️ Important:** Arbitrum networks require `indexer: 'rpc'` configuration

## Release (1.5.6)

This release adds Arbitrum network support with both subgraph and RPC indexing options.

**New in 1.5.6:**
- ✅ Arbitrum One (42161) and Arbitrum Sepolia (421614) subgraph support
- ✅ RPC Indexer with `getAgentById` and `queryAgentMetadata` implementations
- ✅ Flexible indexing: choose between The Graph subgraph (default) or direct RPC
- 📖 See `docs/RPC_INDEXER_LIMITATIONS.md` for RPC indexer capabilities

For breaking changes and migration notes from previous versions, see `release_notes/` folder.

**Bug reports & feedback:** GitHub: [Report issues](https://github.com/agent0lab/agent0-ts/issues) | Telegram: [Agent0 channel](https://t.me/agent0kitchen) | Email: team@ag0.xyz

## Installation

### Prerequisites

- Node.js 22 or higher
- npm or yarn package manager
- Private key for signing transactions (or run in read-only mode)
- Access to an RPC endpoint (e.g., Alchemy, Infura, QuickNode)
- (Optional) IPFS provider account (Pinata, Filecoin, or local IPFS node)

### Install from npm

```bash
npm install agent0-sdk
```

To install a specific version explicitly:

```bash
npm install agent0-sdk@1.5.6
```

**Note:** This package is an ESM (ECMAScript Module) package. Use `import` statements in your code:

```typescript
import { SDK } from 'agent0-sdk';
```

### Install from Source

```bash
git clone https://github.com/agent0lab/agent0-ts.git
cd agent0-ts
npm install
npm run build
```

**Note:** The generated TypeScript types are created as part of `npm run build` (or manually with `npm run codegen`). Always use `npm run build` instead of running `tsc` directly.

## Quick Start

### 1. Initialize SDK (Default: Subgraph Indexer)

```typescript
import { SDK } from 'agent0-sdk';

// Initialize SDK with IPFS and subgraph (default indexer)
const sdk = new SDK({
  chainId: 11155111, // Ethereum Sepolia testnet (use 1 for Ethereum Mainnet)
  rpcUrl: process.env.RPC_URL!,
  privateKey: process.env.PRIVATE_KEY ?? process.env.AGENT_PRIVATE_KEY, // Optional: for write operations
  ipfs: 'pinata', // Options: 'pinata', 'filecoinPin', 'node'
  pinataJwt: process.env.PINATA_JWT // For Pinata
  // Subgraph URL auto-defaults from DEFAULT_SUBGRAPH_URLS
});
```

### 1a. Initialize SDK with RPC Indexer (Optional Alternative)

Use RPC indexer for direct on-chain queries or chains without subgraph:

```typescript
import { SDK } from 'agent0-sdk';

// RPC Indexer: Works with Alchemy, Infura, QuickNode, or any RPC
const sdk = new SDK({
  chainId: 42161, // Arbitrum One
  rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
  privateKey: process.env.PRIVATE_KEY,
  indexer: 'rpc', // 🔧 Use RPC indexer instead of subgraph
  rpcIndexerFromBlock: 150_000_000n, // ⚠️ IMPORTANT: Set to contract deployment block
});

// ✅ Feedback operations work perfectly
const feedbacks = await sdk.searchFeedback({ agents: ['42161:123'] });

// ✅ Get single agent by ID works
const agent = await sdk.getAgent('42161:123');

// ❌ Agent search not supported (requires subgraph for rich filtering)
// await sdk.searchAgents({ name: 'MyAgent' }); // Throws error
```

**RPC Indexer Capabilities:**
- ✅ Full feedback operations (`searchFeedback`, `giveFeedback`, `getFeedback`)
- ✅ Get agent by ID (`getAgent`, `loadAgent`)
- ✅ On-chain metadata queries
- ❌ Agent discovery/search (use subgraph for this)
- 📖 See `docs/RPC_INDEXER_LIMITATIONS.md` for details

**When to use RPC Indexer:**
- Real-time feedback data (subgraph has ~30s indexing delay)
- Local/private chains without subgraph deployment
- Testing or development environments
- You only need feedback operations, not agent search

### 1b. Initialize SDK (browser-side with ERC-6963 wallets)

In the browser you typically keep **reads on your `rpcUrl`** and use a wallet (EIP-1193) for **writes**.

```typescript
import { SDK } from 'agent0-sdk';
import { discoverEip6963Providers, connectEip1193 } from 'agent0-sdk/eip6963';

const providers = await discoverEip6963Providers();
if (providers.length === 0) throw new Error('No injected wallets found');

// Pick a wallet (UI selection recommended)
const { provider } = providers[0];
await connectEip1193(provider); // prompts user

const sdk = new SDK({
  chainId: 11155111,
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
  walletProvider: provider,
});
```

### 2. Create and Register Agent

```typescript
// Create agent
const agent = sdk.createAgent(
  'My AI Agent',
  'An intelligent assistant for various tasks. Skills: data analysis, code generation.',
  'https://example.com/agent-image.png'
);

// Configure endpoints (automatically extracts capabilities)
await agent.setMCP('https://mcp.example.com/'); // Extracts tools, prompts, resources
await agent.setA2A('https://a2a.example.com/agent-card.json'); // Extracts skills
agent.setENS('myagent.eth');

// Add OASF skills and domains (standardized taxonomies)
agent.addSkill('data_engineering/data_transformation_pipeline', true);
agent.addSkill('natural_language_processing/natural_language_generation/summarization', true);
agent.addDomain('finance_and_business/investment_services', true);
agent.addDomain('technology/data_science/data_science', true);

// Optionally set a dedicated agent wallet on-chain (requires new wallet signature).
// If you want agentWallet = owner wallet, you can skip this (contract sets initial value to owner).
// await agent.setWallet('0x...', { newWalletPrivateKey: process.env.NEW_WALLET_PRIVATE_KEY });
agent.setTrust(true, true, false); // reputation, cryptoEconomic, teeAttestation

// Add metadata and set status
agent.setMetadata({ version: '1.0.0', category: 'ai-assistant' });
agent.setActive(true);

// Register on-chain with IPFS
const registrationFile = await agent.registerIPFS();
console.log(`Agent registered: ${registrationFile.agentId}`); // e.g., "11155111:123"
console.log(`Agent URI: ${registrationFile.agentURI}`); // e.g., "ipfs://Qm..."
```

### 3. Load and Edit Agent

```typescript
// Load existing agent for editing
const agent = await sdk.loadAgent('11155111:123'); // Format: "chainId:agentId"

// Edit agent properties
agent.updateInfo(undefined, 'Updated description with new capabilities', undefined);
await agent.setMCP('https://new-mcp.example.com/');

// Re-register to update on-chain
await agent.registerIPFS();
console.log(`Updated: ${agent.agentURI}`);
```

### 4. Search Agents

```typescript
// Unified search (single chain): agent filters + reputation filters in one call
const results = await sdk.searchAgents(
  {
    name: 'AI', // substring
    mcpTools: ['code_generation'],
    a2aSkills: ['python'],
    active: true,
    x402support: true,
    feedback: { minValue: 80, tag: 'enterprise', includeRevoked: false },
  },
  { sort: ['updatedAt:desc'] }
);

for (const agent of results) {
  console.log(`${agent.name}: ${agent.description}`);
  console.log(`  Tools: ${agent.mcpTools?.join(', ')}`);
  console.log(`  Skills: ${agent.a2aSkills?.join(', ')}`);
}

// Multi-chain search (SDK defaults include 1, 11155111, 137)
const multiChainResults = await sdk.searchAgents({ active: true, chains: [1, 11155111, 137] });

console.log(`Found ${multiChainResults.length} agents across chains`);

// Get single agent (read-only, faster)
// Supports chainId:agentId format
const agentSummary = await sdk.getAgent('11155111:123'); // explicit chainId:agentId
```

### 4a. Multi-Chain Search

```typescript
// Search across multiple chains
const results = await sdk.searchAgents({
  active: true,
  chains: [1, 11155111, 137] // Ethereum Mainnet, Ethereum Sepolia, Polygon Mainnet
});

// Search all configured chains
const allResults = await sdk.searchAgents({
  active: true,
  chains: 'all' // Searches all configured chains
});

// Search agents by feedback-derived reputation across chains (unified search)
const reputationResults = await sdk.searchAgents(
  { chains: [1, 11155111, 137], feedback: { minValue: 80, includeRevoked: false } }
);

// Get agent from specific chain
const agent = await sdk.getAgent('1:123'); // Ethereum Mainnet

// Search feedback for a specific agent (unchanged)
const feedbacks = await sdk.searchFeedback({ agentId: '1:123' }); // Ethereum Mainnet

// NEW: Search feedback given by a reviewer wallet (across all agents)
const givenFeedback = await sdk.searchFeedback({
  reviewers: ['0x742d35cc6634c0532925a3b844bc9e7595f0beb7'],
});

// NEW: Search feedback across multiple agents at once
const multiFeedback = await sdk.searchFeedback({
  agents: ['1:123', '1:456', '11155111:789'],
});

// Get reputation summary for agent on specific chain
const summary = await sdk.getReputationSummary('1:123'); // Ethereum Mainnet
```

### 5. Give and Retrieve Feedback

```typescript
// Optional: prepare an OFF-CHAIN feedback file (only needed for rich fields)
const feedbackFile = sdk.prepareFeedbackFile({
  capability: 'tools',
  name: 'code_generation',
  skill: 'python',
  context: { sessionId: 'abc' },
});

// Give feedback (on-chain fields are passed directly)
const tx = await sdk.giveFeedback(
  '11155111:123',
  85, // value (number|string)
  'data_analyst', // tag1 (optional)
  'finance', // tag2 (optional)
  'https://api.example.com/feedback', // endpoint (optional on-chain)
  feedbackFile // optional off-chain file
);
// Submitted-by-default: wait explicitly for confirmation to get a receipt + the domain result
const { receipt, result: feedback } = await tx.waitConfirmed();

// Search feedback
const feedbackResults = await sdk.searchFeedback(
  { agentId: '11155111:123', capabilities: ['tools'] },
  { minValue: 80, maxValue: 100 }
);

// Get reputation summary
const summary = await sdk.getReputationSummary('11155111:123');
console.log(`Average value: ${summary.averageValue}`);
```

## IPFS Configuration Options

```typescript
// Option 1: Filecoin Pin (free for ERC-8004 agents)
const sdk = new SDK({
  chainId: 11155111,
  rpcUrl: '...',
  signer: privateKey,
  ipfs: 'filecoinPin',
  filecoinPrivateKey: 'your-filecoin-private-key'
});

// Option 2: IPFS Node
const sdk = new SDK({
  chainId: 11155111,
  rpcUrl: '...',
  signer: privateKey,
  ipfs: 'node',
  ipfsNodeUrl: 'https://ipfs.infura.io:5001'
});

// Option 3: Pinata (free for ERC-8004 agents)
const sdk = new SDK({
  chainId: 11155111,
  rpcUrl: '...',
  signer: privateKey,
  ipfs: 'pinata',
  pinataJwt: 'your-pinata-jwt-token'
});

// Option 4: HTTP registration (no IPFS)
const sdk = new SDK({ chainId: 11155111, rpcUrl: '...', signer: privateKey });
const regTx = await agent.registerHTTP('https://example.com/agent-registration.json');
await regTx.waitConfirmed();
```

## Multi-Chain Support

The SDK supports **7 blockchain networks** with cross-chain agent discovery and reputation:

| Network | Chain ID | Status | Indexing |
|---------|----------|--------|----------|
| **Ethereum Mainnet** | `1` | ✅ Full Support | Subgraph + RPC |
| **Arbitrum One** | `42161` | ✅ Full Support | Subgraph + RPC |
| **Base Mainnet** | `8453` | ✅ Full Support | Subgraph + RPC |
| **Polygon Mainnet** | `137` | ✅ Full Support | Subgraph + RPC |
| **Ethereum Sepolia** | `11155111` | ✅ Full Support | Subgraph + RPC |
| **Arbitrum Sepolia** | `421614` | ✅ Full Support | Subgraph + RPC |
| **Base Sepolia** | `84532` | ✅ Full Support | Subgraph + RPC |

**Note:** All networks support both The Graph subgraph (default) and RPC indexer. Use `indexer: 'rpc'` for direct on-chain queries without subgraph dependency.

### Chain-Agnostic Agent IDs

Use `chainId:agentId` format to specify which chain an agent is on:

```typescript
// Get agent from specific chain
const agent = await sdk.getAgent('1:1234');      // Ethereum Mainnet
const arbAgent = await sdk.getAgent('42161:456'); // Arbitrum One

// Search feedback for agent on specific chain
const feedbacks = await sdk.searchFeedback({ agentId: '1:1234' });
const arbFeedbacks = await sdk.searchFeedback({ agentId: '42161:456' });

// Get reputation summary for agent on specific chain
const summary = await sdk.getReputationSummary('1:1234');  // Ethereum Mainnet
const arbSummary = await sdk.getReputationSummary('42161:456');  // Arbitrum One
```

### Using Arbitrum Networks

Arbitrum One and Arbitrum Sepolia are fully supported with both subgraph and RPC indexing:

```typescript
// Arbitrum One with subgraph (default, recommended)
const arbSDK = new SDK({
  chainId: 42161,
  rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
  privateKey: process.env.PRIVATE_KEY,
  // Subgraph URL auto-defaults for chain 42161
});

// All operations work: agent search, feedback, reputation
const agents = await arbSDK.searchAgents({ active: true });
const feedbacks = await arbSDK.searchFeedback({ agents: ['42161:123'] });
await arbSDK.giveFeedback('42161:123', 5.0, 'Excellent service', ['quality', 'speed']);

// Alternative: Use RPC indexer for real-time data (optional)
const arbRpcSDK = new SDK({
  chainId: 42161,
  rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
  privateKey: process.env.PRIVATE_KEY,
  indexer: 'rpc', // Direct on-chain queries
  rpcIndexerFromBlock: 150_000_000n,
});

// RPC indexer: feedback operations work, agent search requires subgraph
const agent = await arbRpcSDK.getAgent('42161:123');
console.log(`Agent: ${agent.name}, Owner: ${agent.owners[0]}`);
```

### Multi-Chain Search

Search across multiple chains simultaneously:

```typescript
// Search across multiple chains
const result = await sdk.searchAgents({
  active: true,
  chains: [1, 8453, 11155111, 84532, 137]  // Ethereum Mainnet, Base Mainnet, Ethereum Sepolia, Base Sepolia, Polygon Mainnet
});
// Search all configured chains
const allChainsResult = await sdk.searchAgents({
  active: true,
  chains: 'all'  // Searches all configured chains
});

// Multi-chain feedback-derived reputation search (unified search)
const reputationResult = await sdk.searchAgents(
  { chains: [1, 8453, 11155111, 84532, 137], feedback: { minValue: 80, includeRevoked: false } }
);

// Search all chains for agents with reputation (unified search)
const allChainsReputation = await sdk.searchAgents(
  { chains: 'all', feedback: { minValue: 80, includeRevoked: false } }
);

// Pagination has been removed; multi-chain results are returned as a flat list.
```

### Default Chain Behavior

When you initialize the SDK, you specify a default chain. Agent IDs without a `chainId:` prefix use the default chain:

```typescript
const sdk = new SDK({
  chainId: 11155111,  // Default chain
  rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY'
});

// Uses default chain (11155111)
const agent = await sdk.getAgent('1234');  // Equivalent to "11155111:1234"

// Explicitly specify different chain
const agent = await sdk.getAgent('1:1234');  // Ethereum Mainnet
```

## OASF Taxonomies

The SDK includes support for the **Open Agentic Schema Framework (OASF)** taxonomies, enabling agents to advertise standardized skills and domains. This improves discoverability and interoperability across agent platforms.

### Adding Skills and Domains

```typescript
// Add OASF skills (with optional validation)
agent.addSkill('advanced_reasoning_planning/strategic_planning', true);
agent.addSkill('data_engineering/data_transformation_pipeline', true);

// Add OASF domains (with optional validation)
agent.addDomain('finance_and_business/investment_services', true);
agent.addDomain('technology/data_science/data_visualization', true);

// Remove skills/domains
agent.removeSkill('old_skill');
agent.removeDomain('old_domain');
```

### OASF in Registration Files

OASF skills and domains appear in your agent's registration file:

```json
{
  "endpoints": [
    {
      "name": "OASF",
      "endpoint": "https://github.com/agntcy/oasf/",
      "version": "v0.8.0",
      "skills": [
        "advanced_reasoning_planning/strategic_planning",
        "data_engineering/data_transformation_pipeline"
      ],
      "domains": [
        "finance_and_business/investment_services",
        "technology/data_science/data_science"
      ]
    }
  ]
}
```

### Taxonomy Files

The SDK includes complete OASF v0.8.0 taxonomy files:
- **Skills**: `src/taxonomies/all_skills.json` (136 skills)
- **Domains**: `src/taxonomies/all_domains.json` (204 domains)

Browse these files to find appropriate skill and domain slugs. For more information, see the [OASF specification](https://github.com/agntcy/oasf) and `release_notes/RELEASE_NOTES_0.31.md`.

## Unified Search Reference (Exhaustive)

The unified search API is:

```ts
const results = await sdk.searchAgents(filters?: SearchFilters, options?: SearchOptions);
// results: AgentSummary[]
```

### `FeedbackFilters` (used as `filters.feedback`)

```ts
export interface FeedbackFilters {
  hasFeedback?: boolean;
  hasNoFeedback?: boolean;
  includeRevoked?: boolean;
  minValue?: number;
  maxValue?: number;
  minCount?: number;
  maxCount?: number;
  fromReviewers?: string[];
  endpoint?: string; // substring match
  hasResponse?: boolean;
  tag1?: string;
  tag2?: string;
  tag?: string; // matches tag1 OR tag2
}
```

| Field | Semantics |
| --- | --- |
| `hasFeedback` / `hasNoFeedback` | Filter by whether the agent has any feedback |
| `includeRevoked` | Include revoked feedback entries in the pool used for filtering |
| `minValue` / `maxValue` | Threshold on **average value** over feedback matching the other feedback constraints (inclusive) |
| `minCount` / `maxCount` | Threshold on **count** over feedback matching the other feedback constraints (inclusive) |
| `fromReviewers` | Only consider feedback from these reviewer wallets |
| `endpoint` | Only consider feedback whose `endpoint` contains this substring |
| `hasResponse` | Only consider feedback that has at least one response (if supported) |
| `tag1` / `tag2` | Only consider feedback matching tag1/tag2 |
| `tag` | Shorthand: match either tag1 OR tag2 |

### `SearchFilters`

```ts
export interface SearchFilters {
  chains?: number[] | 'all';
  agentIds?: string[];

  name?: string; // substring
  description?: string; // substring

  owners?: string[];
  operators?: string[];

  hasRegistrationFile?: boolean;
  hasWeb?: boolean;
  hasMCP?: boolean;
  hasA2A?: boolean;
  hasOASF?: boolean;
  hasEndpoints?: boolean;

  webContains?: string;
  mcpContains?: string;
  a2aContains?: string;
  ensContains?: string;
  didContains?: string;

  walletAddress?: string;

  supportedTrust?: string[];
  a2aSkills?: string[];
  mcpTools?: string[];
  mcpPrompts?: string[];
  mcpResources?: string[];
  oasfSkills?: string[];
  oasfDomains?: string[];

  active?: boolean;
  x402support?: boolean;

  registeredAtFrom?: Date | string | number;
  registeredAtTo?: Date | string | number;
  updatedAtFrom?: Date | string | number;
  updatedAtTo?: Date | string | number;

  hasMetadataKey?: string;
  metadataValue?: { key: string; value: string };

  keyword?: string;
  feedback?: FeedbackFilters;
}
```

### `SearchOptions`

```ts
export interface SearchOptions {
  sort?: string[];           // e.g. ["averageValue:desc", "updatedAt:desc"]
  semanticMinScore?: number; // keyword searches only
  semanticTopK?: number;     // keyword searches only
}
```

| Field | Semantics |
| --- | --- |
| `sort` | List of sort keys: `"field:asc"` or `"field:desc"` |
| `semanticMinScore` | Minimum semantic score cutoff (keyword searches only) |
| `semanticTopK` | Limits semantic prefilter size (semantic endpoint has no cursor) |

### `AgentSummary` (returned items)

```ts
export interface AgentSummary {
  chainId: number;
  agentId: string;
  name: string;
  image?: string;
  description: string;
  owners: string[];
  operators: string[];
  // Endpoint strings (present when advertised; not booleans)
  mcp?: string;
  a2a?: string;
  web?: string;
  email?: string;
  ens?: string;
  did?: string;
  walletAddress?: string;
  supportedTrusts: string[];
  a2aSkills: string[];
  mcpTools: string[];
  mcpPrompts: string[];
  mcpResources: string[];
  oasfSkills: string[];
  oasfDomains: string[];
  active: boolean;
  x402support: boolean;
  createdAt?: number;
  updatedAt?: number;
  lastActivity?: number;
  agentURI?: string;
  agentURIType?: string;
  feedbackCount?: number;
  averageValue?: number;
  semanticScore?: number;
  extras: Record<string, any>;
}
```

## 🚀 Coming Soon

- Support for validations
- Enhanced x402 payments
- Advanced reputation aggregation
- Import/Export to centralized catalogues

## Examples

Complete working examples are available in the `examples/` directory:

- `quick-start.ts` - Basic agent creation and registration
- `agent-update.ts` - Agent registration with IPFS
- `feedback-usage.ts` - Complete feedback flow with IPFS storage
- `search-agents.ts` - Agent search and discovery
- `transfer-agent.ts` - Agent ownership transfer

## Documentation

Full documentation is available at [sdk.ag0.xyz](https://sdk.ag0.xyz), including:

- [Installation Guide](https://sdk.ag0.xyz/2-usage/2-1-install/)
- [Agent Configuration](https://sdk.ag0.xyz/2-usage/2-2-configure-agents/)
- [Registration](https://sdk.ag0.xyz/2-usage/2-3-registration-ipfs/)
- [Search](https://sdk.ag0.xyz/2-usage/2-5-search/)
- [Feedback](https://sdk.ag0.xyz/2-usage/2-6-use-feedback/)
- [Key Concepts](https://sdk.ag0.xyz/1-welcome/1-2-key-concepts/)
- [API Reference](https://sdk.ag0.xyz/5-reference/5-1-sdk/)

## License

Agent0 SDK is MIT-licensed public good brought to you by Marco De Rossi in collaboration with Consensys, 🦊 MetaMask and Agent0, Inc. We are looking for co-maintainers. Please reach out if you want to help.

Thanks also to Edge & Node (The Graph), Protocol Labs and Pinata for their support.
