# Qloo MCP Integration Guide

LastRack integrates directly with the official `@qloo/qloo-harness` (pinned at version `0.1.26`) over the Model Context Protocol (MCP) using a managed child process.

---

## 1. Harness Child Process Architecture

The `QlooMcpClient` class (`apps/server/src/qloo/mcpClient.ts`) is responsible for managing the lifecycle of the `@qloo/qloo-harness` process:

```
Fastify Server (Node.js)
       │
       ▼ (spawn child process: "npx @qloo/qloo-harness@0.1.26")
┌──────────────────────────────────────────────┐
│ @qloo/qloo-harness (MCP Server over stdio)   │
│ - JSON-RPC 2.0 Request / Response            │
│ - Tools: qloo_describe, qloo_find_tags,      │
│          qloo_recommend, qloo_rank           │
└──────────────────────────────────────────────┘
```

### Process Management Guarantees:
- **Clean Startup:** Spawns via `child_process.spawn("npx", ["-y", "@qloo/qloo-harness@0.1.26"])` with `QLOO_API_KEY` injected into process environment.
- **Graceful Shutdown:** Implements `SIGINT` / `SIGTERM` listeners ensuring the child process is terminated when the Fastify server stops.
- **Timeout Protection:** Every MCP request is protected by an explicit 10,000ms timeout with retry and exponential backoff.
- **In-Memory Caching:** Results for entity descriptions, tags, and recommendations are cached in-memory with a 15-minute TTL to prevent redundant API queries.

---

## 2. MCP Tools Used by LastRack

LastRack invokes four core tools exposed by `@qloo/qloo-harness`:

### 1. `qloo_describe` (Entity Resolution)
- **Purpose:** Resolves messy, human-entered merchant anchor names into canonical Qloo entity identifiers, verified entity types, and disambiguated labels.
- **Example Call:**
  ```json
  {
    "tool": "qloo_describe",
    "params": {
      "name": "A24",
      "entityType": "brand"
    }
  }
  ```
- **Returns:** Canonical entity ID (`ent_a24_film_001`), official name, and metadata.

### 2. `qloo_find_tags` (Aesthetic Tag Mapping)
- **Purpose:** Identifies shared cultural tags and aesthetic descriptors that co-occur across the merchant's resolved anchor entities.
- **Example Call:**
  ```json
  {
    "tool": "qloo_find_tags",
    "params": {
      "entityIds": ["ent_a24_film_001", "ent_phoebe_bridgers_002", "ent_bode_fashion_003"]
    }
  }
  ```
- **Returns:** Co-occurring tags: `["archive fashion", "cinematic nostalgia", "folk melancholia", "mid-century workwear"]`.

### 3. `qloo_recommend` (Cross-Domain Discovery)
- **Purpose:** Discovers unexpected cross-domain affinities across non-fashion categories (independent films, indie musicians, artisanal bookshops, and local screening rooms).
- **Example Call:**
  ```json
  {
    "tool": "qloo_recommend",
    "params": {
      "signalEntityIds": ["ent_a24_film_001", "ent_phoebe_bridgers_002"],
      "targetCategories": ["film", "brand", "place"]
    }
  }
  ```
- **Returns:** Specific adjacent entities such as *Past Lives* (film), *Nitehawk Cinema* (Brooklyn venue), and *Catbird* (jewelry).

### 4. `qloo_rank` (Single-Query Candidate Ranking)
- **Purpose:** Scores and ranks all generated rescue concepts in a single unified operation against the composite seed signal.
- **Example Call:**
  ```json
  {
    "tool": "qloo_rank",
    "params": {
      "signalEntityIds": ["ent_a24_film_001", "ent_phoebe_bridgers_002", "ent_bode_fashion_003"],
      "candidateEntityIds": [
        "cand_cinematic_workwear",
        "cand_literary_bundle",
        "cand_cinema_popup"
      ]
    }
  }
  ```
- **Returns:** Unified rank ordering with relative affinity scores and provenance `requestId`.

---

## 3. Dual Execution Modes: Live vs. Demo Fixture

LastRack is designed for seamless evaluation by hackathon judges whether an API key is available or not:

| Mode | Condition | Behavior |
| :--- | :--- | :--- |
| `LIVE_QLOO` | `QLOO_API_KEY` present in environment. | Spawns `@qloo/qloo-harness` child process; executes real API calls; records live `requestId` in evidence nodes. |
| `DEMO_FIXTURE` | `QLOO_API_KEY` missing or invalid. | Operates in deterministic fixture mode; emits schema-valid synthetic responses based on the curated synthetic judge scenario; visibly labeled in UI and receipts. |

This guarantee ensures that judges can clone and run the repository immediately without experiencing unhandled runtime errors.
