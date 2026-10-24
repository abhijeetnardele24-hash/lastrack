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
   - Ranks all candidate intervention concepts in **one unified batch query** (`qloo_rank`).
3. **Three Feasible Rescue Experiments:** Formulates three budget-capped experiments across three distinct retail mechanisms:
   - **DISPLAY (Visual Merchandising):** Editorial window and mannequin restyling (e.g. *Cinematic Workwear: 'Past Lives' Reframe*).
   - **BUNDLE (Cross-Category Pairing):** Curated pairing with cultural media (e.g. *Literary & Audio Pairings for Solitary Walks*).
   - **LOCAL_ACTIVATION (Community Gathering):** Low-cost neighbourhood event (e.g. *Independent Cinema Screening Pop-Up Display*).
4. **Deterministic Critique & Guardrails:** Enforces hard commercial constraints ($600 budget cap, execution windows) and filters out prohibited marketing tactics.
5. **Claims Validator:** Strictly eliminates false sales promises, causal demand claims, unauthorized endorsement claims, and individual demographic profiling.
6. **"Why Qloo?" Ablation Comparison:** Directly shows the merchant and judges what happens without Qloo: the agent collapses into generic clearance signs and sidewalk markdowns.
7. **Decision Receipt Export:** Produces a printable, audit-ready HTML and JSON Decision Receipt stamped with the mandatory disclaimer:
   > *"Planning hypothesis—not a sales forecast or endorsement by the named entities."*

---

## How We Built It

- **Monorepo Architecture:** Cleanly decoupled into `@lastrack/contracts` (Zod schemas), `@lastrack/domain` (pure business logic, validators, ablation), `@lastrack/fixtures` (curated synthetic benchmark data), `apps/server` (Fastify API with SSE streaming), and `apps/web` (React 18 + Vite frontend).
- **Official MCP Child Process:** Managed child process spawning `@qloo/qloo-harness@0.1.26` communicating over standard input/output (`stdio`) with JSON-RPC 2.0.
- **Single-Query Ranking Invariant:** Enforced architectural rule ensuring all candidate options are ranked in a single `qloo_rank` batch call, preventing invalid cross-request score comparisons.
- **Editorial Stockroom UI:** Custom Vanilla CSS design system pairing warm editorial paper tones (`#F2EFE7`), archive green (`#1F6B4F`), and terracotta accent (`#B94F32`) with crisp typography and micro-animations.
- **Dual Source Modes:** Transparent toggle between `LIVE_QLOO` and `DEMO_FIXTURE` ensuring zero crashes during offline evaluation.
- **Comprehensive Testing:** 31 automated unit and integration tests with v8 code coverage, TypeScript verification, secret scanning, and multi-stage Docker containerization.

---

## Challenges We Overcame

1. **Ensuring Mathematically Valid Ranking:** Qloo affinity scores reflect relative affinity against a specific query set. Comparing scores across separate API requests is statistically meaningless. We solved this by designing the Single-Query Ranking Invariant: candidate options across all mechanisms are bundled and evaluated in one single batch query, with the batch ID cryptographically bound to the resulting plan.
2. **Preventing AI Overreach & Hallucinations:** Generative agents often invent inflated sales projections. We built an automated `claimsValidator` regex scanner that rejects causal assertions, guaranteed ROI promises, and unauthorized celebrity endorsement claims before results are displayed.
3. **Designing for Independent Merchants:** Independent boutique staff do not have time for complex dashboards. We designed the interface to mimic a high-end editorial lookbook and inventory card, presenting three concrete, actionable bets that can be executed in under an hour.

---

## Accomplishments We're Proud Of

- **100% Core Domain Test Coverage:** Pure TypeScript business logic and contracts verified by 31 passing unit and integration tests.
- **Zero Secrets Leaked:** Automated security scanning verified zero API keys or credentials committed to git history or source trees.
- **Truthful Source-Mode Transparency:** Visible badges and evidence tags clearly indicate whether data came from live Qloo MCP calls or verified synthetic fixtures.
- **Honest Ablation Benchmark:** A working "Why Qloo?" comparison that concretely demonstrates why cultural intelligence is indispensable for non-discount retail recovery.

---

## What We Learned

We discovered that cultural taste graphs operate like an intuitive merchandiser's subconscious. A merchandiser knows by instinct that fans of Phoebe Bridgers and A24 films appreciate the understated craftsmanship of a washed linen overshirt. Qloo provides the mathematical scaffolding to turn that intuition into repeatable, low-risk commercial experiments.

---

## What's Next for LastRack

1. **Shopify & Square Inventory Webhooks:** Real-time triggers that automatically notify boutique owners when a SKU hits 28 days of stagnation.
2. **Localized Foot-Traffic Integrations:** Pulling live event schedules from local indie cinemas, galleries, and vinyl shops within walking distance of the boutique.
3. **Post-Experiment Sell-Through Tracking:** Allowing merchants to record actual sell-through velocity to refine their boutique's taste profile over time.
