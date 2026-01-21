# Release Notes — 1.3.0

This release improves clarity and ergonomics around **agent wallet management**.

## Agent wallet API

### New: `Agent.unsetWallet()`

You can now unset an agent’s on-chain wallet:

```ts
const agent = await sdk.loadAgent('11155111:123');
await agent.unsetWallet();
```

### Rename: `setAgentWallet` / `unsetAgentWallet` → `setWallet` / `unsetWallet`

To match the SDK’s public API naming, wallet methods are now standardized as:

- `agent.setWallet(...)`
- `agent.unsetWallet()`

Legacy names are still available as **deprecated aliases**:

- `agent.setAgentWallet(...)` → calls `agent.setWallet(...)`
- `agent.unsetAgentWallet()` → calls `agent.unsetWallet()`


