# Release Notes — 1.5.0-beta.1 (pre-release)

This is a **pre-release** for the Unified SDK Search refactor. It is intended for early adopters and will **not** be installed by default for normal npm semver ranges (e.g. `^1.4.2`).

## Breaking / API Changes

- **Unified discovery API**
  - `searchAgentsByReputation` **removed**. Use **`searchAgents()`** with `filters.feedback`.
  - `searchAgents()` now takes: `searchAgents(filters?: SearchFilters, options?: SearchOptions)`.
  - Old `SearchParams` surface replaced by `SearchFilters` + `SearchOptions`.

- **AgentSummary endpoint semantics**
  - `mcp` and `a2a` are now **endpoint strings** (not booleans).
  - New endpoint fields may be present: `web`, `email`.

## Added

- **Unified `searchAgents()`**
  - Supports combined agent filters + reputation/feedback filters in one call.
  - Fixes “pagination before filtering” by pushing supported filters into subgraph `where` clauses and using two-phase prefilters where needed.
  - Supports multi-chain correctness via **per-chain cursors** and k-way merge pagination.

- **Semantic keyword search**
  - Integrated external semantic search prefilter via `SemanticSearchClient`.
  - Default endpoint: `https://semantic-search.ag0.xyz/api/v1/search`.

- **Expanded SearchFilters / SearchOptions**
  - New filters (high-level): chains, agentIds, owners/operators, endpoints (existence + substring), registration/status flags, time filters, capability arrays, metadata filters, and rich feedback filters.
  - Sorting keys including `updatedAt`, `createdAt`, `lastActivity`, `feedbackCount`, `averageValue`, and `semanticScore`.
  - Feedback existence filters: `feedback.hasFeedback` / `feedback.hasNoFeedback` (when possible, pushed down via `Agent.totalFeedback`).

- **AgentSummary fields (new/extended)**
  - Adds optional fields such as `createdAt`, `updatedAt`, `agentURI`, `agentURIType`, `feedbackCount`, `lastActivity`, `averageValue`, `semanticScore`, plus endpoint-related fields like `web`, `email`, `oasfSkills`, `oasfDomains`.

- **Polygon Mainnet (read-only discovery)**
  - Added default subgraph URL for **Polygon Mainnet (chainId `137`)**:
    - `https://gateway.thegraph.com/api/782d61ed390e625b8867995389699b4c/subgraphs/id/9q16PZv1JudvtnCAf44cBoxg82yK9SSsFvrjCY9xnneF`

## Subgraph Compatibility Improvements

- **AgentMetadata query name fallback**
  - Some hosted deployments expose metadata list as `agentMetadata_collection` instead of `agentMetadatas`; the SDK now falls back automatically.

- **`hasOASF` compatibility**
  - New `hasOASF` is supported when available; for older deployments that lack `hasOASF` in filter inputs, the SDK falls back to best-effort `oasfEndpoint` existence filtering.
  - Note: exact `hasOASF` semantics are “`oasfSkills` OR `oasfDomains` non-empty” when supported by the deployment.

## Tests

- Added strict, opt-in live tests (`RUN_LIVE_TESTS=1`) with hardcoded mainnet fixtures to validate complex unified search + feedback filtering.

