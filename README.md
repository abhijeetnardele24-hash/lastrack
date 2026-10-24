# LastRack

> **Turn slow stock into a culturally grounded experiment before cutting the price.**

[![CI / Test Suite](https://img.shields.io/badge/Vitest-31%20Passed-brightgreen)](tests/)
[![Security Scan](https://img.shields.io/badge/Security%20Scan-Clean%20(0%20Secrets)-brightgreen)](scripts/security-scan.cjs)
[![MCP Harness](https://img.shields.io/badge/Qloo%20Harness-v0.1.26-1F6B4F)](https://www.npmjs.com/package/@qloo/qloo-harness)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🏛️ For Hackathon Judges: Quick Overview

**LastRack** is a bounded merchandising intelligence agent built for independent fashion retailers. When inventory sits stagnant, traditional retail tools reflexively slash the price—eroding gross margins and cheapening brand identity.

LastRack offers an evidence-backed alternative: **re-contextualize the garment within the cultural world of its intended audience.** Powered by Qloo's cultural AI over the Model Context Protocol (MCP), LastRack identifies cross-domain taste affinities (indie films, music, aesthetics, local screening rooms) and formulates three budget-capped, low-risk merchandising experiments.

- **Target Persona:** Independent boutique owner or merchandiser with slow-moving stock ($100–$500 garments).
- **Core Innovation:** Connects inventory surplus to cultural taste graphs instead of margin-eroding price discounts.
- **AI Safety & Rigor:** Strictly enforces the **Single-Query Ranking Invariant**, deterministic budget caps, and automated regex rejection of sales guarantees, causal demand claims, and demographic profiling.
- **Auditable Truth:** Every recommendation links to an explicit node in the **Evidence Ledger** and exports as a signed Decision Receipt stamped with the mandatory disclaimer:
  > *"Planning hypothesis—not a sales forecast or endorsement by the named entities."*

---

## 🎯 The Benchmark Synthetic Scenario

To enable immediate evaluation without needing live Shopify store credentials, LastRack preloads the curated judge benchmark scenario:

- **Slow Inventory Item:** *Olive Linen Overshirt* (100% Washed European Linen, Horn Buttons)
- **Units on Hand:** 42 units
- **Stagnation Period:** 28 days slow
- **Boutique Location:** Brooklyn, New York
- **Budget Cap:** $600 USD
- **Max Permissible Markdown:** 10%
- **Merchant Cultural Seeds:** *A24*, *Phoebe Bridgers*, *Bode*
- **Forbidden Tactics:** *Paid influencer campaign*, *Individual demographic targeting*

---

## ⚡ Quick Start: Run in 60 Seconds

### Prerequisites
- Node.js `>= 22.19.0`
- npm `>= 10.0.0`

### 1. Installation
```bash
git clone <repository_url>
cd lastrack
npm install
```

### 2. Run All Automated Verification Suites
```bash
# Verify zero secrets or credentials committed
npm run security-scan

# Run all 31 unit & integration tests with coverage
npm test

# Verify TypeScript across all packages and apps
npm run typecheck

# Build contracts, domain, server, and web frontend
npm run build
```

### 3. Launch Development Server
```bash
npm run dev
```
- **Web Frontend:** [http://localhost:5173](http://localhost:5173)
- **Fastify Backend:** [http://localhost:3001](http://localhost:3001)

*(Optional: Set `QLOO_API_KEY=your_key` in `.env` to execute live Qloo MCP calls. When omitted, LastRack runs safely in labeled `DEMO_FIXTURE` mode with 100% functionality).*

---

## 🐳 Docker Deployment

LastRack includes a production-ready, multi-stage Docker setup:

```bash
# Build and run container
docker compose up --build
```
Healthcheck runs automatically on `http://localhost:3001/api/health`.

---

## 🏗️ Architecture & Monorepo Structure

```
lastrack/
├── packages/
│   ├── contracts/     # Shared Zod schemas, data models, state machine types
│   ├── domain/        # Pure domain logic: claims validator, constraints, singleQueryRank, ablation, receipts
│   └── fixtures/      # Preloaded synthetic judge brief and verified demo agent run ledger
├── apps/
│   ├── server/        # Fastify API server, SSE event streaming, MCP child process manager
│   └── web/           # React 18 + Vite frontend with editorial stockroom aesthetic
├── tests/             # Vitest unit and integration suites (31 tests passing)
├── scripts/           # Automated secret scanner (security-scan.cjs)
└── docs/              # Comprehensive architecture, safe use, and evaluation documentation
```

### Bounded Agent State Machine

```
[ IDLE ]
   │
   ▼
[ VALIDATING_BRIEF ] ── (Validates merchant brief, inventory details, budget caps)
   │
   ▼
[ RESOLVING_ANCHORS ] ─ (Calls qloo_describe to establish canonical entity IDs)
   │
   ▼
[ MAPPING_TASTE ] ───── (Calls qloo_find_tags to establish aesthetic co-occurrences)
   │
   ▼
[ GENERATING_CANDIDATES ] (Calls qloo_recommend for cross-domain entities in film, fashion, music, places)
   │
   ▼
[ RANKING_CANDIDATES ] ── (Calls qloo_rank in ONE unified batch query — enforcing Single-Query Invariant)
   │
   ▼
[ CONSTRAINT_CHECK ] ──── (Evaluates budget cap, maximum markdown, and merchant forbidden tactics)
   │
   ▼
[ CRITIQUE ] ──────────── (Automated claims validator: rejects sales promises, causal claims, demographics)
   │
   ▼
[ READY ] ─────────────── (Emits 3 verified experiments, evidence ledger, and ablation baseline)
```

---

## 🔬 Core AI Invariants & Safe-Use Standards

### 1. Single-Query Ranking Invariant
Qloo affinity scores represent affinity *relative to the input signal and the candidate set*. Comparing raw scores across different batch calls or different timestamps is invalid. LastRack enforces in code (`packages/domain/src/singleQueryRank.ts`) that **all comparable candidate options MUST be evaluated in the exact same `qloo_rank` batch call**.

### 2. Zero Demographic Profiling
LastRack strictly prohibits targeting or reasoning based on race, ethnicity, religion, political party, health conditions, or sexual orientation.

### 3. Zero Sales Prophecies
Affinity measures cultural alignment, **not consumer compulsion**. The automated claims validator rejects any language promising guaranteed revenue, uplift percentages, or conversion multipliers.

### 4. Non-Endorsement Disclaimers
LastRack hypotheses never claim official sponsorships or partnerships with referenced artists or studios. All exports carry the unalterable notice:
> *"Planning hypothesis—not a sales forecast or endorsement by the named entities."*

---

## 📊 "Why Qloo?" Ablation Study Summary

| Dimension | With Qloo (LastRack) | Without Qloo (Ablated Baseline) |
| :--- | :--- | :--- |
| **Cultural Entities Discovered** | **3 distinct entities** across film (*Past Lives*), music (*Phoebe Bridgers*), and venues (*Nitehawk Cinema*). | **0 cultural entities**. System is blind to aesthetic subcultures. |
| **Intervention Strategy** | **Storytelling & Context:** Window display restyle, curated reading bundle, local screening room pop-up. | **Price Cutting:** Generic clearance endcap, random bag bundle with markdown, untargeted sidewalk rack. |
| **Price Discount Required** | **0% markdown** (retains full $140 retail value). | **10% - 30% markdown** required to stimulate movement. |
| **Supporting Evidence Ledger** | **6 machine-verified nodes** with explicit Qloo tool request IDs and co-occurrence scores. | **1 node** (only raw merchant inventory count remains). |

*Full ablation report available in [docs/EVALUATION.md](docs/EVALUATION.md).*

---

## 🧪 Verification & Audit Results

As measured and verified on the local test suite:

- **Secret Scan:** 0 credentials detected across all tracked files.
- **Unit & Integration Tests:** 31 passed, 0 failed across 6 test files.
- **TypeScript Typecheck:** 0 errors across 5 workspaces.
- **Workspaces Production Build:** 0 errors (all dist bundles emitted).

```
 Test Files  6 passed (6)
      Tests  31 passed (31)
   Duration  1.10s

 % Coverage report from v8:
 - packages/contracts: 100%
 - packages/domain:    100%
 - apps/server (agent controller): 86.22%
```

---

## 📚 Complete Documentation Index

- [Architecture & Data Pipeline](docs/ARCHITECTURE.md)
- [Qloo MCP Integration Deep-Dive](docs/QLOO_INTEGRATION.md)
- [Safe-Use & Responsible AI Framework](docs/SAFE_USE.md)
- [Evaluation & Ablation Study ("Why Qloo?")](docs/EVALUATION.md)
- [Hackathon Judge 3-Minute Tour](docs/JUDGE_TOUR.md)
- [Devpost Submission Package](docs/DEVPOST_SUBMISSION.md)
- [Submission Checklist & Audit Sign-Off](docs/SUBMISSION_CHECKLIST.md)
- [Machine-Readable Verification Results](docs/verification-results.json)

---

## ⚖️ License

MIT License. See [LICENSE](LICENSE) for details.
