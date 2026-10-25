# LastRack — Devpost Hackathon Submission Package

## Project Name
**LastRack** — Turn slow stock into a culturally grounded experiment before cutting the price.

## Tagline
A bounded merchandising intelligence agent powered by Qloo's cultural AI that rescues slow-moving fashion inventory through taste-aligned visual storytelling, bundling, and community activations.

---

## Inspiration

For independent boutique owners, excess inventory is an existential dilemma. When garments fail to move within 30 days, standard retail playbooks offer only one brutal lever: **slash the price**. 20% off becomes 40% off, margins are destroyed, and the boutique’s curated brand identity is cheapened.

Yet independent fashion is rarely bought for utility—it is bought for **cultural identity and aesthetic resonance**. A slow-moving olive linen overshirt in Brooklyn isn't sitting because it’s defective; it’s sitting because it’s disconnected from the cultural world that gives it meaning.

We asked: **What if an AI agent could help merchants test culturally grounded merchandising hypotheses before sacrificing their margins?** What if, instead of cutting prices, the merchant could connect the garment to the films, music, and aesthetic subcultures their customers already adore? That idea became **LastRack**.

---

## What It Does

LastRack acts as an editorial merchandising strategist for independent fashion retailers:

1. **Merchant Brief Input:** The merchant inputs details on their slow stock (item name, materials, units on hand, days slow, store city, budget cap, and forbidden tactics) along with 3 known cultural anchors that define their customer aesthetic (e.g. *A24*, *Phoebe Bridgers*, *Bode*).
2. **Qloo Taste Graph Exploration:** Using the official `@qloo/qloo-harness` over MCP, LastRack:
   - Resolves messy merchant seeds to canonical entities (`qloo_describe`).
   - Maps co-occurring aesthetic and cultural tags across domains (`qloo_find_tags`).
   - Discovers unexpected cross-domain adjacencies in cinema, literature, and local venues (`qloo_recommend`).
   - Ranks all candidate intervention concepts in **one unified batch query per domain** (`qloo_rank`).
3. **Three Feasible Rescue Experiments:** Formulates three budget-capped experiments across three distinct retail mechanisms:
   - **DISPLAY (Visual Merchandising):** Editorial window and mannequin restyling (e.g. *Cinematic Workwear: 'Past Lives' Reframe*).
   - **BUNDLE (Cross-Category Pairing):** Curated pairing with cultural media (e.g. *Literary & Audio Pairings for Solitary Walks*).
   - **LOCAL_ACTIVATION (Community Gathering):** Low-cost neighbourhood event (e.g. *Independent Cinema Screening Pop-Up Display*).
4. **Deterministic Critique & Guardrails:** Enforces hard commercial constraints ($600 budget cap, execution windows) and filters out prohibited marketing tactics.
5. **Claims Validator:** Strictly eliminates false sales promises, causal demand claims, unauthorized endorsement claims, and individual demographic profiling.
6. **"Why Qloo?" Ablation Comparison:** Directly shows the merchant and judges what happens without Qloo: the agent collapses into generic clearance signs and sidewalk markdowns.
7. **Decision Receipt Export:** Produces a printable, audit-ready HTML and JSON Decision Receipt stamped with a SHA-256 digest and the mandatory disclaimer:
   > *"Planning hypothesis—not a sales forecast or endorsement by the named entities."*

---

## How We Built It

- **Monorepo Architecture:** Cleanly decoupled into `@lastrack/contracts` (Zod schemas), `@lastrack/domain` (pure business logic, validators, ablation, receipts), `@lastrack/fixtures` (curated synthetic benchmark data), `apps/server` (Fastify API with static file serving and SSE streaming), and `apps/web` (React 18 + Vite frontend).
- **Official MCP Process Spawning:** Spawns `@qloo/qloo-harness` via local executable path (`node dist/bin.js mcp`) communicating over standard input/output (`stdio`) with JSON-RPC 2.0 (protocol version `2024-11-05`).
- **Single-Query Ranking Invariant:** Enforced architectural rule ensuring candidate options within a domain are ranked in one batch `qloo_rank` call with score comparability preserved and bound by a SHA-256 `rankDigest` integrity checksum.
- **Editorial Stockroom UI:** Custom Vanilla CSS design system pairing warm editorial paper tones (`#F2EFE7`), archive green (`#1F6B4F`), and terracotta accent (`#B94F32`) with accessible controls and micro-animations.
- **Truthful Source Modes:** Transparent modes (`LIVE_QLOO`, `CACHED_QLOO`, `DEMO_FIXTURE`, `DEGRADED`, `ERROR`) ensuring zero silent fixture substitutions.
- **Automated Verification:** 65 Vitest unit, integration, and contract tests, 26 Playwright E2E and Axe accessibility tests across Desktop Chromium and Mobile Chrome, secret scanning across working tree and Git history, and multi-stage containerization.

---

## Challenges We Overcame

1. **Ensuring Mathematically Valid Ranking:** Qloo affinity scores reflect relative affinity against a specific query set. Comparing scores across separate API requests is statistically invalid. We solved this by designing the Single-Query Ranking Invariant: candidate options within a category are evaluated in one single batch query, with the ranked results bound via a deterministic SHA-256 integrity checksum.
2. **Eliminating Silent Mock Fallbacks:** In complex agentic workflows, systems often silently substitute fixture data when live APIs fail. We re-engineered the controller to maintain strict source-mode truthfulness: unconfigured runs start in labeled `DEMO_FIXTURE` mode with `DEMO_FIXTURE` evidence tags, while live failures transition to `ERROR` rather than faking live data.
3. **Designing for Independent Merchants:** Independent boutique staff do not have time for complex dashboards. We designed the interface to mimic a high-end editorial lookbook and inventory card, presenting three concrete, actionable bets that can be executed in under an hour.

---

## Accomplishments We're Proud Of

- **Rigorous Test Suite:** 91 total tests (65 Vitest unit/integration/contract tests + 26 Playwright E2E and Axe accessibility tests) passing with 0 failures.
- **Zero Secrets Committed:** Automated security scanning verified 0 credentials or tokens committed across the working tree or reachable Git history.
- **Truthful Source-Mode Transparency:** Visible badges and evidence tags clearly indicate whether data came from live Qloo calls or verified synthetic fixtures.
- **Honest Ablation Benchmark:** A working "Why Qloo?" comparison that concretely demonstrates why cultural intelligence is indispensable for non-discount retail recovery.

---

## What We Learned

We discovered that cultural taste graphs operate like an intuitive merchandiser's subconscious. A merchandiser knows by instinct that fans of Phoebe Bridgers and A24 films appreciate the understated craftsmanship of a washed linen overshirt. Qloo provides the mathematical scaffolding to turn that intuition into repeatable, low-risk commercial experiments.

---

## What's Next for LastRack

1. **Shopify & Square Inventory Webhooks:** Real-time triggers that automatically notify boutique owners when a SKU hits 28 days of stagnation.
2. **Localized Foot-Traffic Integrations:** Pulling live event schedules from local indie cinemas, galleries, and vinyl shops within walking distance of the boutique.
3. **Post-Experiment Sell-Through Tracking:** Allowing merchants to record actual sell-through velocity to refine their boutique's taste profile over time.
