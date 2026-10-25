# LastRack — Devpost Hackathon Submission Package

---

## 1. Project Information

### Project Name
**LastRack**

### Tagline
Before discounting slow inventory, LastRack uses Qloo cultural intelligence to design small, evidence-linked merchandising experiments—and shows exactly what becomes generic when Qloo is removed.

### Links & Video
- **GitHub Repository:** [https://github.com/abhijeetnardele24-hash/lastrack](https://github.com/abhijeetnardele24-hash/lastrack)
- **Live Demo URL:** [https://abhijeetnardele24-hash.github.io/lastrack/](https://abhijeetnardele24-hash.github.io/lastrack/) — public `DEMO_FIXTURE` judge build; no private key required
- **Unlisted YouTube Video URL:** [https://youtu.be/IR_Zenyjizs](https://youtu.be/IR_Zenyjizs) — 2:26, 1080p, Unlisted

### Submission Asset Paths
- **Thumbnail Image (1280×720):** `docs/assets/thumbnail.png`
- **Screenshot 1 (Overview & Brief):** `docs/assets/screenshots/01-overview-brief-form.png`
- **Screenshot 2 (Interventions Board):** `docs/assets/screenshots/02-interventions-board.png`
- **Screenshot 3 (Ablation Comparison):** `docs/assets/screenshots/03-ablation-comparison-modal.png`
- **Screenshot 4 (Decision Receipt):** `docs/assets/screenshots/04-decision-receipt-modal.png`
- **Screenshot 5 (Evidence Ledger):** `docs/assets/screenshots/05-evidence-drawer.png`
- **System Architecture Diagram:** `docs/assets/architecture.png`

---

## 2. Copy-Ready Narrative Sections

### Inspiration

For independent boutique owners, stagnant seasonal inventory is an existential problem. When a curated garment sits unsold past 28 days, conventional retail playbooks offer only one blunt lever: **slash the price**. 20% off becomes 40% off, gross margins are destroyed, and the shop’s editorial identity is cheapened.

Yet discounting is frequently an **information failure**, not a product defect. In independent retail, garments are rarely bought for pure utility; they are purchased for aesthetic resonance and cultural identity. A slow-moving olive linen overshirt in Brooklyn isn't sitting because European linen is obsolete; it is sitting because it sits in visual isolation, disconnected from the cultural world that gives it meaning.

We asked: **What if an AI agent could help merchants test culturally grounded merchandising hypotheses before sacrificing their margins?** What if, instead of cutting prices, the merchant could connect the garment to the films, music, literature, and neighbourhood spaces their patrons already adore? That question became **LastRack**.

---

### What It Does

LastRack acts as a bounded merchandising intelligence agent that designs small, evidence-linked retail interventions before a merchant touches the markdown marker:

1. **Merchant Brief Intake:** The merchant inputs details on their slow stock (item name, materials, units on hand, days slow, store city, budget cap, and forbidden tactics) along with 3 known cultural anchors that define their customer aesthetic (e.g. *A24*, *Phoebe Bridgers*, *Bode*).
2. **Qloo Cultural Graph Exploration:** Using the official `@qloo/qloo-harness` over the Model Context Protocol (MCP), LastRack:
   - Resolves merchant seeds to canonical entities (`qloo_describe`).
   - Maps co-occurring aesthetic and thematic descriptors across domains (`qloo_find_tags`).
   - Discovers unexpected cross-domain adjacencies in cinema, literature, and local venues (`qloo_recommend`).
   - Ranks all candidate intervention concepts in **one unified batch query per domain** (`qloo_rank`).
3. **Three Feasible Merchandising Experiments:** Formulates three budget-capped experiments across three distinct retail mechanisms:
   - **DISPLAY (Visual Merchandising):** Window and styling reframes connecting the garment to cinematic or aesthetic narratives (e.g. *Cinematic Workwear: 'Past Lives' Editorial Reframe* at $180 est. cost).
   - **BUNDLE (Cross-Category Pairing):** Curated physical pairings with cultural media (e.g. *Literary & Audio Pairings for Solitary Walks* at $250 est. cost).
   - **LOCAL_ACTIVATION (Community Gathering):** Low-cost neighbourhood collaborations with independent venues (e.g. *Independent Cinema Screening Pop-Up Display* at $420 est. cost).
4. **Deterministic Guardrails & Policy Checks:** Enforces hard commercial constraints ($600 budget ceiling, execution windows) and filters out prohibited marketing tactics.
5. **Claims Validator:** Strictly eliminates false sales promises, causal demand claims, unauthorized endorsement claims, and individual demographic profiling.
6. **"Why Qloo?" Ablation Comparison:** Directly shows the merchant and judges what happens without Qloo: the agent collapses into generic clearance signs and sidewalk markdowns.
7. **Decision Receipt Export:** Produces an auditable, timestamped HTML and JSON Decision Receipt stamped with a SHA-256 digest and the mandatory disclaimer:
   > *"Planning hypothesis—not a sales forecast or endorsement by the named entities."*

---

### How We Built It

- **Modular Monorepo Architecture:** Cleanly decoupled into `@lastrack/contracts` (Zod schemas, data models), `@lastrack/domain` (pure domain logic: claims validator, budget constraints, single-query rank invariant, ablation, receipts), `@lastrack/fixtures` (curated synthetic benchmark data), `apps/server` (Fastify API with static file serving and SSE streaming), and `apps/web` (React 18 + Vite frontend).
- **Official MCP Child Process Spawning:** Spawns `@qloo/qloo-harness` directly via local executable path (`node dist/bin.js mcp`) communicating over standard input/output (`stdio`) with JSON-RPC 2.0 (protocol version `2024-11-05`).
- **Single-Query Ranking Invariant:** Enforced architectural rule: *"One `qloo_rank` batch per comparable entity domain."* Candidate options within the same entity domain are evaluated in one single batch query, with the ranked results bound via a deterministic SHA-256 `rankDigest` integrity checksum.
- **Editorial Stockroom UI:** Custom Vanilla CSS design system pairing archival paper tones (`#F2EFE7`), heritage forest green (`#1F6B4F`), and terracotta accent (`#B94F32`) with accessible controls, responsive layouts, and zero generic chatbot clutter.
- **Truthful Source Modes:** Transparent modes (`LIVE_QLOO`, `CACHED_QLOO`, `DEMO_FIXTURE`, `DEGRADED`, `ERROR`) ensuring zero silent fixture substitutions.
- **Exhaustive Automated Verification:** 92 Vitest unit, integration, contract, and verifier tests, 26 Playwright E2E and Axe accessibility tests across Desktop Chromium and Mobile Chrome, secret scanning across working tree and Git history, and dual-mode evidence verification.

---

### Qloo Integration

LastRack leverages Qloo's cultural AI over the Model Context Protocol (MCP) as its core intelligence engine:

- **Protocol Version:** MCP `2024-11-05` over standard I/O (`stdio`).
- **Tool Pipeline:**
  1. `qloo_capabilities`: Verifies server capability advertisements and tool schemas on process startup.
  2. `qloo_describe`: Takes informal merchant cultural seeds (*A24*, *Phoebe Bridgers*, *Bode*) and resolves them to canonical entities with entity IDs, primary categories, and verified metadata.
  3. `qloo_find_tags`: Analyzes canonical entity profiles to extract high-affinity thematic tags (*archive fashion*, *cinematic nostalgia*, *indie folk*, *craft heritage*).
  4. `qloo_recommend`: Performs cross-domain queries linking fashion entities to external media domains (film catalogue *Past Lives*, reflective poetry literature, independent screening rooms).
  5. `qloo_rank`: Ranks candidate intervention concepts against seed profiles to select the most culturally resonant pairings.
- **Single-Query Invariant:** Enforces that all candidates within a single domain are submitted in one batch call to preserve relative score validity.

---

### Challenges We Overcame

1. **Ensuring Mathematically Valid Ranking:** Qloo affinity scores reflect relative affinity against a specific query set and entity domain. Comparing scores across separate API requests or cross-domain scores directly is statistically invalid. We solved this by enforcing the Single-Query Ranking Invariant: *"One `qloo_rank` batch per comparable entity domain."* Candidate options within the same entity domain are evaluated in one single batch query, with the ranked results bound via a deterministic SHA-256 integrity checksum.
2. **Eliminating Silent Mock Fallbacks:** In complex agentic workflows, systems often silently substitute fixture data when live APIs fail. We re-engineered the controller to maintain strict source-mode truthfulness: unconfigured runs start in labeled `DEMO_FIXTURE` mode with `DEMO_FIXTURE` evidence tags, while live errors transition to `ERROR` rather than faking live data.
3. **Designing for Independent Merchants:** Independent boutique staff do not have time for complex dashboards. We designed the interface to mimic a high-end editorial lookbook and inventory card, presenting three concrete, actionable bets that can be executed in under an hour.
4. **Non-Circular CI Evidence Architecture:** Local test runs generate machine artifacts with local timestamps and hashes, which caused fresh CI runs to fail when comparing transient hashes. We engineered a dual-mode verification architecture where committed evidence is validated for metadata and ancestry integrity, while CI generates and validates independent same-run evidence.

---

### Accomplishments We're Proud Of

- **118 Total Automated Tests Passing:** 92 Vitest unit/integration/contract tests + 26 Playwright E2E and automated Axe accessibility tests passing with zero failures.
- **Zero Leaked Secrets:** Automated security scanning verified zero credentials or tokens committed across the working tree or reachable Git history.
- **Truthful Source-Mode Transparency:** Visible badges and evidence tags clearly indicate whether data came from live Qloo calls or verified synthetic fixtures.
- **The "Why Qloo?" Ablation Benchmark:** A working ablation comparison that concretely demonstrates why cultural intelligence is indispensable for non-discount retail recovery.

---

### What We Learned

We discovered that cultural taste graphs operate like an intuitive merchandiser's subconscious. A seasoned boutique buyer knows by instinct that customers drawn to Phoebe Bridgers and A24 films appreciate the tactile craftsmanship of washed European linen. Qloo provides the mathematical scaffolding to turn that artistic intuition into repeatable, low-risk commercial experiments.

---

### What's Next for LastRack

1. **Shopify & Square Inventory Webhooks:** Real-time triggers that automatically notify boutique owners when a SKU hits 28 days of stagnation.
2. **Localized Foot-Traffic Integrations:** Pulling live event schedules from local indie cinemas, galleries, and vinyl shops within walking distance of the boutique.
3. **Post-Experiment Sell-Through Tracking:** Allowing merchants to record actual sell-through velocity to refine their boutique's taste profile over time.

---

## 3. Disclosures & Checklist

### Built-With Technologies
- `TypeScript`
- `React 18`
- `Vite`
- `Fastify`
- `Node.js`
- `Qloo Cultural AI`
- `Model Context Protocol (MCP)`
- `@qloo/qloo-harness`
- `Zod`
- `Vitest`
- `Playwright`
- `@axe-core/playwright`
- `ESLint 9`

### Responsible-Use & Privacy Disclosure
- **Zero Demographic Profiling:** No targeting or segmentation based on race, ethnicity, religion, political affiliation, health conditions, or sexual orientation.
- **Zero Surveillance:** Operates purely on aggregate cultural co-occurrence graphs without collecting or storing individual customer browsing histories or personal data.
- **No Sales Guarantees:** Recommendations are planning hypotheses, not demand forecasts.
- **Mandatory Non-Endorsement Notice:** All exports carry the notice: *"Planning hypothesis—not a sales forecast or endorsement by the named entities."*

### Fixture vs. Live-Data Disclosure
- Default offline mode runs using curated synthetic benchmark data clearly labeled `DEMO_FIXTURE`.
- Live Qloo mode requires configuring `QLOO_API_KEY` and is truthfully labeled `LIVE_QLOO`.

---

## 4. Final Submission Checklist

- [x] Repository is public at [https://github.com/abhijeetnardele24-hash/lastrack](https://github.com/abhijeetnardele24-hash/lastrack).
- [x] Release tags pushed to GitHub.
- [x] GitHub Actions workflow has completed successfully.
- [x] Public judge demo deployed at [https://abhijeetnardele24-hash.github.io/lastrack/](https://abhijeetnardele24-hash.github.io/lastrack/).
- [x] Video rendered following `docs/VIDEO_HANDOFF.md` (2:25, 1080p, 30 fps, normalized audio, captions).
- [x] Video uploaded to YouTube with visibility set to **UNLISTED**.
- [x] YouTube URL pasted into the Devpost submission form.
- [x] Devpost form fields filled using the copy-ready sections above.
- [x] `docs/assets/thumbnail.png` uploaded as project thumbnail.
- [x] Screenshots 1 through 5 uploaded to Devpost media gallery.
- [x] Final submission published at [https://devpost.com/software/lastrack](https://devpost.com/software/lastrack) before the hackathon deadline.
