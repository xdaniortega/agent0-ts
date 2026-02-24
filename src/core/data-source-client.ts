/**
 * DataSourceClient — minimal abstraction over any agent/feedback data backend.
 *
 * Follows the ChainClient pattern: interface defined here, implementations
 * live in separate files (SubgraphClient, RpcIndexerClient, …).
 *
 * Only the methods actually called by AgentIndexer and FeedbackManager
 * are included. SubgraphClient exposes additional public methods (getAgents,
 * searchAgents, etc.) that remain on that class but are NOT part of this interface.
 */

import type { AgentSummary } from '../models/interfaces.js';
import type {
  SearchAgentsV2Options,
  QueryAgentMetadata,
  QueryFeedback,
} from './subgraph-client.js';

export interface DataSourceClient {
  /**
   * Fetch agents matching the given filter/pagination options.
   * Used by AgentIndexer._fetchAllAgentsV2().
   */
  searchAgentsV2(opts: SearchAgentsV2Options): Promise<AgentSummary[]>;

  /**
   * Look up a single agent by its composite ID ("chainId:tokenId").
   * Used by AgentIndexer.getAgent() and SDK.getAgent().
   */
  getAgentById(agentId: string): Promise<AgentSummary | null>;

  /**
   * Query raw feedback rows with optional filters, pagination, and sort.
   * Used by AgentIndexer._prefilterByFeedback() and FeedbackManager.getReputationSummary().
   */
  queryFeedbacks(
    where: Record<string, unknown>,
    first: number,
    skip: number,
    orderBy?: string,
    orderDirection?: 'asc' | 'desc'
  ): Promise<QueryFeedback[]>;

  /**
   * Query raw agent metadata rows.
   * Used by AgentIndexer._prefilterByMetadata().
   */
  queryAgentMetadata(
    where: Record<string, unknown>,
    first: number,
    skip: number
  ): Promise<QueryAgentMetadata[]>;

  /**
   * Rich feedback search with named filter params.
   * Used by FeedbackManager.searchFeedback() and FeedbackManager.getReputationSummary().
   */
  searchFeedback(
    params: {
      agents?: string[];
      reviewers?: string[];
      tags?: string[];
      capabilities?: string[];
      skills?: string[];
      tasks?: string[];
      names?: string[];
      minValue?: number;
      maxValue?: number;
      includeRevoked?: boolean;
    },
    first?: number,
    skip?: number,
    orderBy?: string,
    orderDirection?: 'asc' | 'desc'
  ): Promise<any[]>;
}
