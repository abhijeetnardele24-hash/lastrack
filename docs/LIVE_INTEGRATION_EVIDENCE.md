# LastRack — Qloo MCP Integration & Canonical Contract Evidence

This document details the canonical Model Context Protocol (MCP) integration between **LastRack** and the official `@qloo/qloo-harness` distribution, including contract checksums, tool schemas, mathematical invariants, and evidence traceability.

---

## 1. Canonical MCP Process Spawning & Handshake

LastRack communicates with the Qloo taste intelligence graph via the standard JSON-RPC 2.0 Model Context Protocol over `stdio` pipes.

### Execution Command
Rather than relying on an ambiguous or network-enabled `npx` wrapper (which was previously failing with `unknown command "qloo"` due to argument misalignment), LastRack directly locates and executes the installed harness distribution binary via `process.execPath`:

```typescript
const binPath = fileURLToPath(import.meta.resolve("@qloo/qloo-harness"));
// Spawns: node <node_modules>/@qloo/qloo-harness/dist/bin.js mcp
this.process = spawn(process.execPath, [binPath, "mcp"], {
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, QLOO_API_KEY: this.apiKey },
});
```

### Protocol Handshake & Capability Exchange
1. **Request (`initialize`)**: LastRack sends `protocolVersion: "2024-11-05"` along with client capabilities (`tools`).
2. **Notification (`notifications/initialized`)**: LastRack immediately confirms session activation per the official MCP specification.
3. **Capability Validation (`qloo_capabilities`)**: LastRack validates that required operations exist and checks the canonical contract version.

- **MCP Protocol Version:** `2024-11-05`
- **Contract Version:** `1.0.0`
- **Canonical Contract Checksum:** `sha256:762bdcc5e14ff797b6de739d2658a83f78af35e68d7a5a3449455be6046924f5`

---

## 2. Canonical Tool Schemas

LastRack strictly adheres to the four canonical Qloo tool schemas without inventing undocumented fields:

### `qloo_describe`
Inspects an entity and retrieves its normalized canonical metadata and tags.
```json
{
  "entity": "A24",
  "type": "brand"
}
```
*Supported types:* `movie`, `artist`, `brand`, `place`.

### `qloo_find_tags`
Performs natural-language semantic or keyword searches across Qloo's taste taxonomy.
```json
{
  "query": "minimalist heritage workwear linen",
  "semantic": true,
  "limit": 10
}
```

### `qloo_recommend`
Queries Qloo's cross-domain affinity graph using confirmed entity signals or tags.
```json
{
  "target_type": "movie",
  "signals": ["A24", "Bode"],
  "signal_tags": ["cinematic", "heritage"],
  "limit": 5
}
```

### `qloo_rank`
Ranks candidate options of a single domain against anchor signals in a single batch.
```json
{
  "options": ["Past Lives", "Aftersun", "First Cow", "The Zone of Interest"],
  "option_type": "movie",
  "signals": ["A24"]
}
```

---

## 3. The Single-Query Batch Ranking Invariant

Under Qloo's mathematical model, affinity scores across separate API requests do not share a common global scale. Attempting to rank mixed entity types or issuing sequential individual rank calls corrupts score comparability.

LastRack enforces a strict algorithmic invariant:
1. **Same-domain comparability:** Only entities belonging to the exact same Qloo domain (`movie`, `artist`, `brand`, or `place`) are ever passed into `qloo_rank`. Internal merchandising concepts are never submitted to `qloo_rank`.
2. **Single-query execution:** All candidate entities for a domain are ranked in one unified batch call.
3. **Integrity digest binding:** The batch domain, input options, signals, and ranked score vector are hashed into a deterministic canonical integrity digest `rankDigest` (`sha256:...`) and embedded directly into the candidate plan's `scoreContext`. This serves as an integrity checksum and audit trail, not a cryptographic signature.

---

## 4. Truthful Source Modes & Fixture Integrity

LastRack eliminates all silent fixture substitution. The top-level `sourceMode` reflects reality at all times:

| Source Mode | Condition | Behavior |
| :--- | :--- | :--- |
| `LIVE_QLOO` | Valid `QLOO_API_KEY` configured and confirmed via MCP handshake. | All entities, tags, and ranks are dynamically queried from live Qloo. Evidence tagged `QLOO_EVIDENCE`. |
| `CACHED_QLOO` | Previous successful live query in cache. | Returned with `cached: true` and tagged `CACHED_QLOO`. |
| `DEMO_FIXTURE` | No key configured or explicitly running the synthetic judge demonstration. | Visibly labeled with green shield in header. Evidence strictly tagged `DEMO_FIXTURE`. |
| `DEGRADED` | Non-fatal optional stage failure (e.g., place recommendations timeout). | Preserves valid partial evidence without crashing; informs user. |
| `ERROR` | Invalid configured key, rate limit, or fatal MCP crash. | Transitions to `ERROR` state with descriptive error message. **Never silently swaps in mock data.** |

---

## 5. Automated Causal Ablation Proof

To prove that Qloo intelligence is causally essential rather than cosmetic styling, LastRack includes an automated ablation engine (`@lastrack/domain/ablation.ts`):

- **With Qloo:** Yields specific cultural entities (*Past Lives*, *Toast UK*, *Nitehawk Cinema*, *Word Bookstore*) with verifiable correlation scores and SHA-256 bound evidence nodes.
- **Without Qloo (Ablated Baseline):** Strips all taste signals and cross-domain lookups, causing the merchandising plan to collapse into generic retail markdowns (*"20% Off Clearance Rack"*, *"Sidewalk Sale Sign"*).

This contrast is verified automatically in `tests/unit/ablation.test.ts` and in the interactive `AblationModal`.
