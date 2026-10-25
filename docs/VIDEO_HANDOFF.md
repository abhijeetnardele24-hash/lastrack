# LastRack — Demo Video Production & Recording Handoff

> **Important Boundary Notice:** The coding agent does **NOT** generate, record, edit, render, voiceover, or upload the demo video. All video creation and YouTube submission are performed separately by the project owner. This document provides the complete, turn-key production specification for that recording session.

---

## Technical Specifications

| Parameter | Specification | Notes |
| :--- | :--- | :--- |
| **Target Duration** | **2 minutes 30 seconds** (Hard Maximum: 3 minutes 00 seconds) | Keep pacing crisp and purposeful |
| **Aspect Ratio & Resolution** | **16:9 widescreen, 1920×1080 (1080p)** | Record at native 1080p or 4K scaled |
| **Frame Rate** | **30 fps or 60 fps** | Ensure smooth UI scrolling |
| **Audio** | Clear spoken narration (48 kHz AAC/PCM) | Level dialogue; minimize background noise |
| **Recommended Thumbnail** | [`docs/assets/thumbnail.png`](assets/thumbnail.png) (1280×720) | Upload as official video thumbnail |
| **Target Platform** | **YouTube** | Set visibility strictly to **UNLISTED** |
| **Caption Safe Areas** | Leave bottom 120px clear of critical UI interactions | Ensures subtitles do not obscure buttons |

---

## Pre-Recording Environment Setup

1. **Clean Browser Window:**
   - Use Google Chrome or Brave in a dedicated profile with bookmarks bar and extensions hidden (`Shift+Ctrl+B`).
   - Browser viewport set to `1920×1080` (or `1280×800` scaled cleanly).
   - Set browser zoom to `100%` (or `110%` if higher readability is desired).
2. **Local Application Launch:**
   ```bash
   cd lastrack
   npm run dev
   ```
   - Frontend URL: `http://localhost:5173`
   - Fastify API Server: `http://127.0.0.1:3001`
3. **Initial State Verification:**
   - Navigating to `http://localhost:5173` should display the masthead with the green **LastRack** brandmark, status badges, and the preloaded *Olive Linen Overshirt* brief.
   - Confirm source badge shows `DEMO_FIXTURE` (or `LIVE_QLOO` if running with an active key).
4. **Privacy & Redaction Safeguards:**
   - Do **NOT** record terminal windows containing API keys or private filesystem paths.
   - Browser URL bar should show clean `http://localhost:5173`.
   - Never display or verbalize `QLOO_API_KEY` or any private credentials.

---

## 9-Step Demo Recording Sequence (Pacing & Talking Points)

### Total Timeline: 2 minutes 30 seconds

```
[0:00 - 0:25] Step 1 & 2: The Stagnant Inventory Dilemma & Brief
[0:25 - 0:45] Step 3: Cultural Anchors & Hard Constraints
[0:45 - 1:05] Step 4: Executing the Bounded Agent
[1:05 - 1:30] Step 5: The Three Merchandising Experiments
[1:30 - 1:50] Step 6: Evidence Ledger & Audit Provenance
[1:50 - 2:05] Step 7: "Why Qloo?" Ablation Modal
[2:05 - 2:20] Step 8: Decision Receipt Export
[2:20 - 2:30] Step 9: Core Message & Ethical Guardrails
```

---

### Step-by-Step Breakdown

#### Step 1 & 2: The Stagnant Inventory Dilemma (0:00 – 0:25)
- **On Screen:** Clean view of the LastRack masthead and preloaded Brief Formulation Card.
- **Action:** Cursor smoothly points to the inventory inputs: *Olive Linen Overshirt*, *42 units on hand*, *28 days slow*, *Brooklyn NY*.
- **Spoken Talking Point:**
  > *"When seasonal inventory sits past 28 days, traditional retail systems reflexively slash the price. But discounting is often an information failure, not a product failure. In independent retail, garments are bought for aesthetic identity, not utility. Slashing this olive linen overshirt by 30% burns hundreds of dollars in margin without asking why the customer walked past it."*

#### Step 3: Cultural Anchors & Commercial Constraints (0:25 – 0:45)
- **On Screen:** Scroll down slightly to highlight the Cultural Seeds and Policy Constraints sections.
- **Action:** Hover over the cultural seed badges (*A24*, *Phoebe Bridgers*, *Bode*), budget cap (*$600*), and forbidden tactics (*Paid influencer ads, Demographic targeting*).
- **Spoken Talking Point:**
  > *"LastRack introduces cultural intelligence before the markdown marker. We enter three cultural anchors that reflect our boutique's community—indie cinema, introspective folk, and heritage craft—and lock in hard commercial boundaries: a $600 maximum budget, a 10% maximum markdown tolerance, and strict prohibitions against paid social ads or demographic profiling."*

#### Step 4: Executing the Bounded Agent (0:45 – 1:05)
- **On Screen:** Click the green **"Run LastRack Agent"** button.
- **Action:** Watch the Live Agent Workbench step tracker progress through the 8 bounded states: `VALIDATING_BRIEF` → `RESOLVING_ANCHORS` → `MAPPING_TASTE` → `GENERATING_CANDIDATES` → `RANKING_CANDIDATES` → `CONSTRAINT_CHECK` → `CRITIQUE` → `READY`.
- **Spoken Talking Point:**
  > *"When we run the agent, LastRack communicates with Qloo's cultural AI over the Model Context Protocol. It grounds our seeds into canonical entities, maps aesthetic tags, discovers cross-domain affinities across film, literature, and venues, and ranks candidates using our Single-Query Ranking Invariant: exactly one batch per comparable domain."*
- **Editing Note:** Any artificial loading delay can be cut in editing, but keep the progression visible to show state machine execution.

#### Step 5: The Three Feasible Merchandising Experiments (1:05 – 1:30)
- **On Screen:** Scroll to the **Intervention Board** showing the 3 generated experiment cards.
- **Action:** Smoothly hover over each card:
  1. *DISPLAY:* Cinematic Workwear: 'Past Lives' Editorial Reframe ($180 est. cost, 0% markdown)
  2. *BUNDLE:* Literary & Audio Pairings for Solitary Walks ($250 est. cost, 0% markdown)
  3. *LOCAL_ACTIVATION:* Independent Cinema Screening Pop-Up Display ($420 est. cost, 0% markdown)
- **Spoken Talking Point:**
  > *"Rather than generic markdowns, LastRack formulates three budget-capped experiments across three distinct retail mechanisms: visual merchandising that reframes the shirt through cinematic nostalgia, a bundle pairing the shirt with reflective literature, and a community pop-up at a local Brooklyn screening room. Notice that all three maintain full $140 retail value with zero price cuts."*

#### Step 6: Evidence Ledger & Audit Provenance (1:30 – 1:50)
- **On Screen:** Click the **"Evidence Ledger"** button on the first experiment card.
- **Action:** The Evidence Drawer slides open from the right. Highlight the machine-verified nodes, Qloo tool request IDs, and co-occurrence scores. Close drawer.
- **Spoken Talking Point:**
  > *"Nothing is a black box. Clicking into any experiment opens the Evidence Ledger. Every cultural link is grounded in verifiable Qloo tool calls—showing exact affinity scores, tag mappings, and deterministic constraint checks. Every recommendation is an auditable planning hypothesis."*

#### Step 7: "Why Qloo?" Ablation Modal (1:50 – 2:05)
- **On Screen:** Click the **"Why Qloo? (Ablation Test)"** button in the top toolbar.
- **Action:** The side-by-side comparison modal opens.
- **Spoken Talking Point:**
  > *"What happens without Qloo? When we ablate cultural intelligence, the agent loses its storytelling vocabulary. It discovers zero cultural entities, falls back to generic clearance racks, and is forced to slash the price by 15% to 30%, wiping out up to $1,700 in boutique gross margin."*

#### Step 8: Decision Receipt Export (2:05 – 2:20)
- **On Screen:** Click **"Select & Export Experiment"** on Experiment 1. The Decision Receipt modal opens.
- **Action:** Highlight the SHA-256 integrity digest, the budget adherence check, and click **"Export HTML Receipt"** (or point to the clean printable receipt).
- **Spoken Talking Point:**
  > *"The merchant selects their preferred experiment and exports an auditable Decision Receipt—complete with a SHA-256 integrity digest, budget verification, and our mandatory disclaimer: 'Planning hypothesis—not a sales forecast or endorsement by the named entities.'"*

#### Step 9: Core Message & Ethical Guardrails (2:20 – 2:30)
- **On Screen:** Return to the main view, highlighting the responsible-use footer.
- **Action:** Fade out cleanly.
- **Spoken Talking Point:**
  > *"Before discounting slow inventory, LastRack uses Qloo cultural intelligence to design small, evidence-linked merchandising experiments—and shows exactly what becomes generic when Qloo is removed. Thank you."*

---

## Post-Recording Checklist

- [ ] Duration is between 2:15 and 2:45.
- [ ] Spoken audio is crisp, well-paced, and free of background noise.
- [ ] No API keys, secret tokens, or local user paths were captured.
- [ ] Uploaded to YouTube with visibility set to **UNLISTED**.
- [ ] Thumbnail set to `docs/assets/thumbnail.png`.
- [ ] Unlisted YouTube URL copied and added to `docs/DEVPOST_SUBMISSION.md`.
