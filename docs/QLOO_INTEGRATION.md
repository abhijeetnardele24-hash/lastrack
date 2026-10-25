# Qloo MCP Integration Guide

LastRack integrates directly with the official `@qloo/qloo-harness` distribution (version `0.1.26`) over the Model Context Protocol (MCP) using a managed child process.

---

## 1. Harness Child Process Architecture

The `QlooMcpClient` class (`apps/server/src/qloo/mcpClient.ts`) is responsible for managing the lifecycle of the `@qloo/qloo-harness` process:

```
Fastify Server (Node.js)
       │
       ▼ (spawn child process: node <path-to>/@qloo/qloo-harness/dist/bin.js mcp)
┌──────────────────────────────────────────────┐
│ @qloo/qloo-harness (MCP Server over stdio)   │
│ - JSON-RPC 2.0 Request / Response            │
│ - Canonical Tools: qloo_describe,            │
│   qloo_find_tags, qloo_recommend, qloo_rank  │
└──────────────────────────────────────────────┘
```

### Process Management Guarantees:
- **Direct Executable Execution:** Spawns `node dist/bin.js mcp` directly rather than invoking an ambiguous or network-dependent wrapper.
- **Fail-Closed MCP Validation:** On startup (`initialize`), verifies:
  1. `protocolVersion === "2024-11-05"`
  2. `contractChecksum === "sha256:762bdcc5e14ff797b6de739d2658a83f78af35e68d7a5a3449455be6046924f5"`
  3. `adapter.ready === true`
  4. All four required operations (`describe`, `find_tags`, `recommend`, `rank`) are present.
  If any check fails, `mcpReady` remains `false` and execution fails closed.
- **Graceful Shutdown:** Implements `server.addHook('onClose')` and process exit hooks ensuring the child process is terminated cleanly via `SIGTERM` / `SIGKILL`.
- **Timeout Protection:** Every MCP request is protected by an explicit 10,000ms timeout with retry and exponential backoff.
- **In-Memory Caching:** Results for entity descriptions, tags, and recommendations are cached in-memory with a 15-minute TTL to prevent redundant API queries.

---

## 2. Canonical MCP Tool Schemas Used by LastRack

LastRack strictly adheres to the four canonical Qloo tool schemas:

### 1. `qloo_describe` (Entity Resolution)
- **Purpose:** Resolves merchant anchor names into canonical Qloo entity identifiers and metadata.
- **Call Schema:**
  ```json
  {
    "entity": "A24",
    "type": "brand"
  }
  ```
- **Returns:** Canonical entity ID (`ent_a24_film_001`), official name, and metadata.

### 2. `qloo_find_tags` (Aesthetic Tag Mapping)
- **Purpose:** Identifies shared cultural tags and aesthetic descriptors that co-occur with query concepts.
- **Call Schema:**
  ```json
  {
    "query": "minimalist heritage workwear linen",
    "semantic": true,
    "limit": 10
  }
  ```
- **Returns:** Co-occurring tags: `["archive fashion", "cinematic nostalgia", "folk melancholia", "mid-century workwear"]`.

### 3. `qloo_recommend` (Cross-Domain Discovery)
- **Purpose:** Discovers unexpected cross-domain affinities across non-fashion categories (independent films, indie musicians, artisanal bookshops, and local screening rooms).
- **Call Schema:**
  ```json
  {
    "target_type": "movie",
    "signals": ["A24", "Bode"],
    "signal_tags": ["cinematic", "heritage"],
    "limit": 5
  }
  ```
- **Returns:** Specific adjacent entities such as *Past Lives* (film), *Nitehawk Cinema* (Brooklyn venue), and *Catbird* (jewelry).

### 4. `qloo_rank` (Single-Query Candidate Ranking)
- **Purpose:** Scores and ranks candidate options of a single domain against anchor signals in a single batch.
- **Call Schema:**
  ```json
  {
    "options": ["Past Lives", "Aftersun", "First Cow", "The Zone of Interest"],
    "option_type": "movie",
    "signals": ["A24"]
  }
  ```
- **Returns:** Canonical status (`ok`, `empty`, `needs_input`, `partial`, `degraded`, or `error`), ordered rank results, affinity scores, and provenance `requestId`.
- **Integrity Digest:** Bound by deterministic SHA-256 integrity checksum (`rankDigest`).

---

## 3. Dual Execution Modes: Live vs. Demo Fixture

LastRack is designed for seamless evaluation by hackathon judges whether an API key is available or not:

| Mode | Condition | Behavior |
| :--- | :--- | :--- |
| `LIVE_QLOO` | `QLOO_API_KEY` present in environment and MCP child process healthy. | Spawns `@qloo/qloo-harness` child process; executes live API calls; records live `requestId` in evidence nodes. |
| `DEMO_FIXTURE` | `QLOO_API_KEY` missing or running synthetic benchmark scenario. | Operates in deterministic fixture mode; emits schema-valid synthetic responses based on the curated synthetic judge scenario; visibly labeled with green shield in UI and receipts. |
| `DEGRADED` | Optional stage failure or partial result during live session. | Preserves valid partial evidence without crashing; records explicit warnings. |
| `ERROR` | Live failure (bad API key, network partition, or rate limit). | Transitions honestly to ERROR state. **Never silently swaps in mock data.** |

---

## 4. Contract Handshake Test

The integration is automatically tested via a real child-process contract test in `tests/contract/mcpChildProcess.test.ts`. This test:
1. Spawns the installed `@qloo/qloo-harness` binary (`dist/bin.js mcp`).
2. Performs the JSON-RPC `initialize` handshake and `notifications/initialized` notification.
3. Invokes `qloo_capabilities` to verify protocol version `2024-11-05`, checksum `sha256:762bdcc5e14ff797b6de739d2658a83f78af35e68d7a5a3449455be6046924f5`, and `adapter.ready === true`.
4. Tests fail-closed rejection on invalid command paths.
5. Shuts down the child process cleanly.
