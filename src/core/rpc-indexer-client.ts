/**
 * RpcIndexerClient — DataSourceClient implementation backed by eth_getLogs via viem.
 *
 * Targets the REPUTATION_REGISTRY's NewFeedback and FeedbackRevoked events.
 *
 * Agent discovery methods (searchAgentsV2, getAgentById, queryAgentMetadata)
 * are stubs for v1 — feedback indexing via eth_getLogs is the primary use case.
 *
 * Works with any standard RPC provider (Alchemy, Infura, local node, etc.).
 * The rpcUrl is the same one passed to SDKConfig — no separate config needed.
 *
 * Known limitations:
 * - createdAt is set to blockNumber (not unix timestamp) as a sort-order proxy.
 * - No in-memory caching: each call re-fetches logs from fromBlock to latest.
 *   Set fromBlock to the contract deployment block to minimize RPC calls.
 * - hasResponse filter is unsupported (responses require separate events not
 *   emitted by the reputation contract).
 */

import { createPublicClient, http, defineChain } from 'viem';
import type { DataSourceClient } from './data-source-client.js';
import type { AgentSummary } from '../models/interfaces.js';
import type { Address } from '../models/types.js';
import type { SearchAgentsV2Options, QueryAgentMetadata, QueryFeedback } from './subgraph-client.js';
import { REPUTATION_REGISTRY_ABI, IDENTITY_REGISTRY_ABI } from './contracts.js';
import { decodeReputationValue } from '../utils/value-encoding.js';
import { formatAgentId } from '../utils/id-format.js';

export type RpcIndexerClientConfig = {
  chainId: number;
  rpcUrl: string;
  reputationRegistryAddress: Address;
  /**
   * Maximum blocks per eth_getLogs request.
   * Defaults to 2000 (Alchemy safe default).
   * Lower this if you hit "block range too large" errors.
   */
  maxBlockRange?: bigint;
  /**
   * Earliest block to index from.
   * Strongly recommended: set this to the REPUTATION_REGISTRY deployment block
   * to avoid scanning from genesis. Check Etherscan for the contract creation tx.
   */
  fromBlock?: bigint;
};

// Extract the NewFeedback and FeedbackRevoked event ABI items from the full ABI.
const NEW_FEEDBACK_EVENT = REPUTATION_REGISTRY_ABI.find(
  (item) => item.type === 'event' && item.name === 'NewFeedback'
)!;

const FEEDBACK_REVOKED_EVENT = REPUTATION_REGISTRY_ABI.find(
  (item) => item.type === 'event' && item.name === 'FeedbackRevoked'
)!;

export class RpcIndexerClient implements DataSourceClient {
  private readonly publicClient: ReturnType<typeof createPublicClient>;
  private readonly reputationRegistryAddress: Address;
  private readonly maxBlockRange: bigint;
  private readonly fromBlock: bigint;
  private readonly chainId: number;

  constructor(config: RpcIndexerClientConfig) {
    this.chainId = config.chainId;
    this.reputationRegistryAddress = config.reputationRegistryAddress;
    this.maxBlockRange = config.maxBlockRange ?? 2000n;
    this.fromBlock = config.fromBlock ?? 0n;

    const chain = defineChain({
      id: config.chainId,
      name: `chain-${config.chainId}`,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [config.rpcUrl] } },
    });

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });
  }

  // ---------------------------------------------------------------------------
  // AGENT METHODS — partial support via direct RPC calls
  // ---------------------------------------------------------------------------

  /**
   * Search agents with filters (NOT SUPPORTED via RPC).
   * 
   * Why: Agent discovery with rich filters requires off-chain data aggregation:
   * - name, description, image → stored in IPFS/JSON via agentURI (not indexable)
   * - capabilities, skills, tasks → complex metadata structures off-chain
   * - totalFeedback, lastActivity → require aggregating NewFeedback events across all agents
   * - operators → require tracking Transfer events for each agent
   * - Text/semantic search → requires pre-processed indexes
   * 
   * The IDENTITY_REGISTRY contract only provides:
   * - ownerOf(tokenId) — single agent owner
   * - tokenURI(tokenId) — single agent URI
   * - getMetadata(tokenId, key) — single agent metadata
   * - NO function to list/enumerate/filter agents
   * 
   * Solution: Use subgraph for agent discovery, or implement custom indexer
   * that maintains an agent database with off-chain data parsed from events/IPFS.
   */
  async searchAgentsV2(_opts: SearchAgentsV2Options): Promise<AgentSummary[]> {
    throw new Error(
      'searchAgentsV2 is not supported by RpcIndexerClient. ' +
        'Agent discovery with rich filters (name, capabilities, totalFeedback, etc.) requires ' +
        'off-chain data aggregation from events and IPFS. ' +
        'Use a subgraph or custom indexer for agent search. ' +
        'Either remove the indexer: "rpc" option or use a custom dataSource that supports agent queries.'
    );
  }

  /**
   * Get a single agent by its composite ID (chainId:tokenId).
   * Reads data directly from IDENTITY_REGISTRY contract.
   * 
   * Limitations:
   * - Does NOT fetch/parse agentURI JSON (IPFS) — only returns URI
   * - Does NOT calculate totalFeedback (requires event aggregation)
   * - Does NOT fetch operators (requires Transfer event history)
   * - registrationFile is null (requires IPFS fetch)
   */
  async getAgentById(agentId: string): Promise<AgentSummary | null> {
    try {
      const parts = agentId.split(':');
      if (parts.length !== 2) {
        return null;
      }
      
      const chainId = parseInt(parts[0], 10);
      const tokenId = BigInt(parts[1]);
      
      if (chainId !== this.chainId) {
        return null; // Wrong chain
      }

      // Read from IDENTITY_REGISTRY contract
      const identityAddress = await this.publicClient.readContract({
        address: this.reputationRegistryAddress as `0x${string}`,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'getIdentityRegistry',
      }) as `0x${string}`;

      // Get owner
      const owner = await this.publicClient.readContract({
        address: identityAddress,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'ownerOf',
        args: [tokenId],
      }) as string;

      // Get agentURI
      let agentURI: string | undefined;
      try {
        agentURI = await this.publicClient.readContract({
          address: identityAddress,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'tokenURI',
          args: [tokenId],
        }) as string;
      } catch {
        // tokenURI might not exist
      }

      // Get agentWallet
      let agentWallet: string | undefined;
      try {
        const wallet = await this.publicClient.readContract({
          address: identityAddress,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'getAgentWallet',
          args: [tokenId],
        }) as string;
        // Normalize zero address to undefined
        if (wallet && wallet !== '0x0000000000000000000000000000000000000000') {
          agentWallet = wallet.toLowerCase();
        }
      } catch {
        // getAgentWallet might fail if not set
      }

      // Construct minimal AgentSummary (as Partial like SubgraphClient)
      // Return Partial because we don't have all required fields (name, description, etc.)
      return {
        chainId,
        agentId,
        name: agentId, // Fallback: use agentId as name since we can't fetch IPFS data
        description: '', // Empty since we don't fetch IPFS
        owners: [owner.toLowerCase()],
        operators: [], // Not available via RPC (requires Transfer event history)
        supportedTrusts: [],
        a2aSkills: [],
        mcpTools: [],
        mcpPrompts: [],
        mcpResources: [],
        oasfSkills: [],
        oasfDomains: [],
        active: false, // Unknown without IPFS data
        x402support: false, // Unknown without IPFS data
        agentURI,
        agentURIType: agentURI ? this._detectURIType(agentURI) : undefined,
        walletAddress: agentWallet,
        createdAt: undefined, // Not available (requires Registered event lookup)
        updatedAt: undefined, // Not available (requires URIUpdated event lookup)
        lastActivity: undefined, // Not available (requires event aggregation)
        feedbackCount: undefined, // Not available (requires NewFeedback event aggregation)
        extras: {},
      } as AgentSummary;
    } catch (error) {
      // Agent doesn't exist or RPC error
      return null;
    }
  }

  /**
   * Query on-chain metadata entries via MetadataSet events.
   * 
   * Supported where filters:
   * - agent_in: string[] — filter by composite agentId ("chainId:tokenId")
   * - key: string — exact key match
   * - key_contains: string — key contains substring (case-sensitive)
   */
  async queryAgentMetadata(
    where: Record<string, unknown>,
    first: number,
    skip: number
  ): Promise<QueryAgentMetadata[]> {
    const latestBlock = await this.publicClient.getBlockNumber();
    
    // Get IDENTITY_REGISTRY address
    const identityAddress = await this.publicClient.readContract({
      address: this.reputationRegistryAddress as `0x${string}`,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'getIdentityRegistry',
    }) as `0x${string}`;

    // Fetch all MetadataSet events
    const metadataSetLogs = await this._fetchAllMetadataSetLogs(
      identityAddress,
      this.fromBlock,
      latestBlock
    );

    // Decode and filter
    const decoded = this._decodeMetadataSetLogs(metadataSetLogs);
    const filtered = this._applyMetadataFilters(decoded, where);

    // Sort by updatedAt desc (most recent first)
    filtered.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));

    return filtered.slice(skip, skip + first);
  }

  // ---------------------------------------------------------------------------
  // FEEDBACK METHODS — implemented via eth_getLogs
  // ---------------------------------------------------------------------------

  /**
   * Query feedback rows from on-chain events with filters and pagination.
   *
   * Supported `where` keys:
   *   agent_in: string[]          — filter by composite agentId ("chainId:tokenId")
   *   clientAddress_in: string[]  — filter by reviewer address (lowercase)
   *   isRevoked: boolean          — true to include only revoked, false to exclude revoked
   *   tag1: string                — exact tag1 match
   *   tag2: string                — exact tag2 match
   *   value_gte: number           — minimum decoded value
   *   value_lte: number           — maximum decoded value
   *   _tags_or: string[]          — at least one of these tags must appear in tag1 or tag2
   */
  async queryFeedbacks(
    where: Record<string, unknown>,
    first: number,
    skip: number,
    _orderBy: string = 'createdAt',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<QueryFeedback[]> {
    const latestBlock = await this.publicClient.getBlockNumber();
    const [newFeedbackLogs, revokedKeys] = await Promise.all([
      this._fetchAllNewFeedbackLogs(this.fromBlock, latestBlock),
      this._fetchRevokedKeys(this.fromBlock, latestBlock),
    ]);

    const decoded = this._decodeNewFeedbackLogs(newFeedbackLogs, revokedKeys);
    const filtered = this._applyWhereFilters(decoded, where);

    // Sort by blockNumber as createdAt proxy
    filtered.sort((a, b) => {
      const aVal = Number(a.createdAt ?? 0n);
      const bVal = Number(b.createdAt ?? 0n);
      return orderDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return filtered.slice(skip, skip + first);
  }

  /**
   * Rich feedback search with named filter params.
   * Maps to queryFeedbacks() internally.
   */
  async searchFeedback(
    params: {
      agents?: string[];
      reviewers?: string[];
      tags?: string[];
      minValue?: number;
      maxValue?: number;
      includeRevoked?: boolean;
      // v1: capabilities/skills/tasks/names are off-chain only and not indexable from events
    },
    first: number = 100,
    skip: number = 0,
    orderBy: string = 'createdAt',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<any[]> {
    const where: Record<string, unknown> = {};

    if (params.agents && params.agents.length > 0) {
      where.agent_in = params.agents;
    }
    if (params.reviewers && params.reviewers.length > 0) {
      where.clientAddress_in = params.reviewers.map((a) => a.toLowerCase());
    }
    if (!params.includeRevoked) {
      where.isRevoked = false;
    }
    if (params.minValue !== undefined) {
      where.value_gte = params.minValue;
    }
    if (params.maxValue !== undefined) {
      where.value_lte = params.maxValue;
    }
    if (params.tags && params.tags.length > 0) {
      where._tags_or = params.tags;
    }

    return this.queryFeedbacks(where, first, skip, orderBy, orderDirection);
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Detect URI type from URI string.
   */
  private _detectURIType(uri: string): string {
    if (uri.startsWith('ipfs://')) return 'ipfs';
    if (uri.startsWith('http://') || uri.startsWith('https://')) return 'http';
    if (uri.startsWith('ar://')) return 'arweave';
    return 'unknown';
  }

  /**
   * Fetch all MetadataSet events from IDENTITY_REGISTRY.
   */
  private async _fetchAllMetadataSetLogs(
    identityAddress: `0x${string}`,
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<any[]> {
    const METADATA_SET_EVENT = IDENTITY_REGISTRY_ABI.find(
      (item) => item.type === 'event' && item.name === 'MetadataSet'
    )!;

    const all: any[] = [];
    let start = fromBlock;
    while (start <= toBlock) {
      const end =
        start + this.maxBlockRange - 1n < toBlock ? start + this.maxBlockRange - 1n : toBlock;
      const chunk = await this.publicClient.getLogs({
        address: identityAddress,
        event: METADATA_SET_EVENT as any,
        fromBlock: start,
        toBlock: end,
      });
      all.push(...chunk);
      start = end + 1n;
    }
    return all;
  }

  /**
   * Decode MetadataSet logs into QueryAgentMetadata shape.
   */
  private _decodeMetadataSetLogs(logs: any[]): QueryAgentMetadata[] {
    const results: QueryAgentMetadata[] = [];
    const latestByKey = new Map<string, QueryAgentMetadata>(); // key: "agentId:key"

    for (const log of logs) {
      try {
        const args = log.args as {
          agentId: bigint;
          metadataKey: string;
          metadataValue: Uint8Array;
        };
        if (!args) continue;

        const agentIdComposite = formatAgentId(this.chainId, Number(args.agentId));
        const key = args.metadataKey;
        const value = this._decodeMetadataValue(args.metadataValue);
        const mapKey = `${agentIdComposite}:${key}`;

        // Only keep latest value per agent:key
        const existing = latestByKey.get(mapKey);
        if (!existing || log.blockNumber > existing.updatedAt) {
          latestByKey.set(mapKey, {
            id: `${agentIdComposite}:${key}`,
            key,
            value,
            updatedAt: log.blockNumber ?? 0n,
            agent: { id: agentIdComposite },
          });
        }
      } catch {
        // Skip malformed log entries
      }
    }

    return Array.from(latestByKey.values());
  }

  /**
   * Decode metadata value bytes to string.
   */
  private _decodeMetadataValue(bytes: Uint8Array): string {
    try {
      // Try UTF-8 decode
      return new TextDecoder().decode(bytes);
    } catch {
      // Fallback: hex string
      return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }

  /**
   * Apply where-filter object to decoded metadata rows.
   */
  private _applyMetadataFilters(
    rows: QueryAgentMetadata[],
    where: Record<string, unknown>
  ): QueryAgentMetadata[] {
    return rows.filter((meta) => {
      if (where.agent_in && Array.isArray(where.agent_in)) {
        if (!where.agent_in.includes(meta.agent.id)) return false;
      }

      if (where.key !== undefined && meta.key !== where.key) return false;

      if (where.key_contains !== undefined) {
        if (!meta.key.includes(String(where.key_contains))) return false;
      }

      return true;
    });
  }

  /**
   * Paginate getLogs for NewFeedback events across the full block range.
   * Alchemy limits ranges to 2,000 blocks by default.
   */
  private async _fetchAllNewFeedbackLogs(fromBlock: bigint, toBlock: bigint): Promise<any[]> {
    const all: any[] = [];
    let start = fromBlock;
    while (start <= toBlock) {
      const end =
        start + this.maxBlockRange - 1n < toBlock ? start + this.maxBlockRange - 1n : toBlock;
      const chunk = await this.publicClient.getLogs({
        address: this.reputationRegistryAddress as `0x${string}`,
        event: NEW_FEEDBACK_EVENT as any,
        fromBlock: start,
        toBlock: end,
      });
      all.push(...chunk);
      start = end + 1n;
    }
    return all;
  }

  /**
   * Builds a Set of revoked feedback keys in format "tokenId:clientAddr:feedbackIndex".
   * Used to mark isRevoked on decoded NewFeedback logs.
   */
  private async _fetchRevokedKeys(fromBlock: bigint, toBlock: bigint): Promise<Set<string>> {
    const keys = new Set<string>();
    let start = fromBlock;
    while (start <= toBlock) {
      const end =
        start + this.maxBlockRange - 1n < toBlock ? start + this.maxBlockRange - 1n : toBlock;
      const chunk = await this.publicClient.getLogs({
        address: this.reputationRegistryAddress as `0x${string}`,
        event: FEEDBACK_REVOKED_EVENT as any,
        fromBlock: start,
        toBlock: end,
      });
      for (const log of chunk) {
        const args = (log as any).args;
        if (args?.agentId !== undefined && args?.clientAddress && args?.feedbackIndex !== undefined) {
          keys.add(
            `${args.agentId}:${String(args.clientAddress).toLowerCase()}:${args.feedbackIndex}`
          );
        }
      }
      start = end + 1n;
    }
    return keys;
  }

  /**
   * Decode raw viem log objects into QueryFeedback shape.
   * Sets createdAt = blockNumber as a sort-order proxy for unix timestamp.
   */
  private _decodeNewFeedbackLogs(logs: any[], revokedKeys: Set<string>): QueryFeedback[] {
    const results: QueryFeedback[] = [];
    for (const log of logs) {
      try {
        const args = log.args as {
          agentId: bigint;
          clientAddress: string;
          feedbackIndex: bigint;
          value: bigint;
          valueDecimals: number;
          tag1: string;
          tag2: string;
          endpoint: string;
          feedbackURI: string;
        };
        if (!args) continue;

        const agentIdComposite = formatAgentId(this.chainId, Number(args.agentId));
        const revokeKey = `${args.agentId}:${args.clientAddress.toLowerCase()}:${args.feedbackIndex}`;
        const isRevoked = revokedKeys.has(revokeKey);

        // Composite ID matching subgraph format: "chainId:tokenId:clientAddress:feedbackIndex"
        const id = `${agentIdComposite}:${args.clientAddress.toLowerCase()}:${args.feedbackIndex}`;

        const decodedValue = decodeReputationValue(args.value, args.valueDecimals);

        results.push({
          id,
          agent: { id: agentIdComposite },
          clientAddress: args.clientAddress.toLowerCase(),
          value: String(decodedValue),
          tag1: args.tag1 || null,
          tag2: args.tag2 || null,
          endpoint: args.endpoint || null,
          isRevoked,
          // blockNumber used as createdAt proxy — preserves sort order without extra RPC calls
          createdAt: log.blockNumber ?? 0n,
          responses: null,
        });
      } catch {
        // Skip malformed log entries
      }
    }
    return results;
  }

  /**
   * Apply where-filter object to decoded feedback rows.
   */
  private _applyWhereFilters(rows: QueryFeedback[], where: Record<string, unknown>): QueryFeedback[] {
    return rows.filter((fb) => {
      if (where.agent_in && Array.isArray(where.agent_in)) {
        if (!where.agent_in.includes(fb.agent.id)) return false;
      }

      if (where.clientAddress_in && Array.isArray(where.clientAddress_in)) {
        if (!where.clientAddress_in.includes(fb.clientAddress.toLowerCase())) return false;
      }

      if (where.isRevoked === false && fb.isRevoked) return false;
      if (where.isRevoked === true && !fb.isRevoked) return false;

      if (where.tag1 !== undefined && fb.tag1 !== where.tag1) return false;
      if (where.tag2 !== undefined && fb.tag2 !== where.tag2) return false;

      const numValue = Number(fb.value ?? 0);
      if (where.value_gte !== undefined && numValue < Number(where.value_gte)) return false;
      if (where.value_lte !== undefined && numValue > Number(where.value_lte)) return false;

      if (where._tags_or && Array.isArray(where._tags_or)) {
        const tags = where._tags_or as string[];
        if (!tags.includes(fb.tag1 ?? '') && !tags.includes(fb.tag2 ?? '')) return false;
      }

      return true;
    });
  }
}
