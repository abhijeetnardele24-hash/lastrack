# LastRack — Hackathon Judge Rapid Tour (3 Minutes)

Welcome to the **LastRack** evaluation walkthrough for the Qloo Agentic Hackathon! This document guides you through testing both the backend API and the interactive web workbench.

---

## Quick Start (Under 60 Seconds)

### Step 1: Clone and Install
```bash
git clone <repository_url>
cd lastrack
npm install
```

### Step 2: Run Full Automated Verification Suite
```bash
# Runs secret scanner, all 31 unit & integration tests, TypeScript typechecking, and production builds
npm run security-scan
npm test
npm run typecheck
npm run build
```
*(All suites pass out of the box with zero errors).*

### Step 3: Launch Both Frontend & Backend
```bash
npm run dev
```
- **Backend API:** `http://localhost:3001`
- **Frontend UI:** `http://localhost:5173`

---

## 3-Minute Guided Walkthrough

### 1. The Pre-Loaded Synthetic Scenario
Open `http://localhost:5173` in your browser.
- Look at the top masthead: Notice the **Source Mode Badge** (`DEMO_FIXTURE` or `LIVE_QLOO`) and **Qloo MCP Child Process** status.
- Look at the **Inventory Brief Form**: The judge benchmark scenario is preloaded:
  - **Item:** *Olive Linen Overshirt* (42 units, 28 days slow, Brooklyn NY)
  - **Budget Cap:** *$600 USD*, Max Markdown: *10%*
  - **Cultural Seeds:** *A24*, *Phoebe Bridgers*, *Bode*
  - **Forbidden Tactics:** *Paid influencer campaign*, *Individual demographic targeting*

### 2. Run the Bounded Agent
Click the green **"Run LastRack Agent"** button.
- Observe the **Live Agent Workbench**:
  - The step tracker advances through the 8 bounded states (`VALIDATING_BRIEF` -> `RESOLVING_ANCHORS` -> `MAPPING_TASTE` -> `GENERATING_CANDIDATES` -> `RANKING_CANDIDATES` -> `CONSTRAINT_CHECK` -> `CRITIQUE` -> `READY`).
  - Watch the live telemetry logs display tool names (`qloo_describe`, `qloo_find_tags`, `qloo_recommend`, `qloo_rank`) and batch rank IDs.

### 3. Review the 3 Culturally Grounded Experiments
Scroll down to the **Intervention Board**:
- **Experiment 1 (DISPLAY):** *Cinematic Workwear: 'Past Lives' Editorial Reframe* ($180 est. cost)
- **Experiment 2 (BUNDLE):** *Literary & Audio Pairings for Solitary Walks* ($250 est. cost)
- **Experiment 3 (LOCAL_ACTIVATION):** *Independent Cinema Screening Pop-Up Display* ($420 est. cost)
- Note the **Green Constraint Badges** confirming budget caps and tactic compliance.

### 4. Inspect the Evidence Ledger
Click **"Evidence Ledger (6 nodes)"** in the top navigation or on any experiment card:
- A drawer slides open showing every claim mapped to an explicit evidence class (`MERCHANT_INPUT`, `QLOO_EVIDENCE`, `DETERMINISTIC_DERIVATION`).
- Note the request IDs and specific Qloo tools for full traceability.

### 5. Inspect the "Why Qloo?" Ablation Modal
Click the **"Why Qloo? (Ablation)"** button in the header:
- A comparative view opens contrasting LastRack's culturally grounded plan against the ablated baseline.
- Demonstrates how, without Qloo, the system collapses into generic markdown signs and sidewalk sales.

### 6. Export the Decision Receipt
Click **"Export Receipt"** on any experiment:
- Select **Printable HTML** to preview the clean, print-ready experiment card.
- Verify the mandatory disclaimer:
  > *"Planning hypothesis—not a sales forecast or endorsement by the named entities."*

---

## Direct Terminal / cURL Verification

If you prefer testing the backend directly via terminal:

```bash
# Check system health & source mode
curl -s http://localhost:3001/api/health

# Check metadata & safe use compliance
curl -s http://localhost:3001/api/meta

# Retrieve the full verified run ledger
curl -s http://localhost:3001/api/runs/run-demo-synthetic-001

# Export the decision receipt JSON
curl -s http://localhost:3001/api/runs/run-demo-synthetic-001/export
```
