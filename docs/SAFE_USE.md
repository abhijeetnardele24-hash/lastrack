# LastRack Safe-Use & Responsible AI Framework

LastRack is built from the ground up to respect cultural sensitivity, prevent deceptive marketing practices, and adhere strictly to Qloo's safe-use principles.

---

## 1. Principles of Responsible Merchandising

LastRack treats cultural intelligence not as a tool for micro-targeting consumers, but as a creative compass for indie merchants to tell compelling product stories.

### Principle 1: Zero Individual Demographic Profiling
- **Prohibited:** LastRack strictly prohibits any inputs, queries, or hypothesis generation based on sensitive personal characteristics, including race, ethnicity, religion, political affiliation, health status, or sexual orientation.
- **Enforcement:** The `claimsValidator` regex engine scans all plan titles, hypotheses, and action steps for prohibited terms and halts execution if detected.

### Principle 2: Zero Sales Guarantees or Prophecies
- **Prohibited:** We explicitly reject "AI forecasting" that promises definite revenue uplifts, guaranteed sell-through numbers, or causal guarantees (e.g. "guaranteed 4x return", "will increase sales by 40%").
- **Enforcement:** Cultural affinity measures statistical co-occurrence and taste alignment, **not consumer compulsion**. Any plan attempting to claim a guaranteed sales outcome is rejected with `FORBIDDEN_SALES_PROMISE`.

### Principle 3: No False Commercial Endorsements
- **Prohibited:** Merchandising hypotheses must never claim or imply an official sponsorship, partnership, or celebrity endorsement with the referenced cultural entities.
- **Enforcement:** Plans claiming "official partnership with A24" or "endorsed by Phoebe Bridgers" are immediately flagged and rejected with `UNSUPPORTED_ENDORSEMENT_CLAIM`.

### Principle 4: Mandatory Disclaimer on All Artifacts
Every exported artifact, print card, JSON payload, and HTML decision receipt includes the prominent, unalterable notice:

> **"Planning hypothesis—not a sales forecast or endorsement by the named entities."**

---

## 2. Bounded Autonomous Agency

Unlike unbound generative agents that can hallucinate unconstrained actions or consume endless API budgets, LastRack is tightly bounded:
- **Maximum 15 MCP Calls:** Hard ceiling prevents recursive query loops.
- **Bounded Mechanism Palette:** Restricts outputs to three proven independent retail tactics: `DISPLAY` (visual merchandising), `BUNDLE` (cross-merchandising), and `LOCAL_ACTIVATION` (community event).
- **Hard Commercial Constraints:** If an experiment exceeds the merchant's budget cap ($600 in the judge scenario) or violates a forbidden tactic (e.g., paid social ads), the plan is marked as `FAIL` and excluded from recommendation.
- **Human-in-the-Loop:** The agent never executes purchases, spends merchant budgets, or changes inventory systems directly. It outputs an **actionable, auditable experiment card** for the merchant to approve and execute.

---

## 3. Automated Critique & Guardrail Architecture

The critique phase runs automatically before any plan is presented to the merchant:

```
Proposed Plan
     │
     ├── 1. Budget & Constraint Check (deterministic arithmetic)
     │
     ├── 2. Single-Query Ranking Check (batch call identity validation)
     │
     ├── 3. Forbidden Language Scan (sales promises, causality, endorsement)
     │
     ├── 4. Sensitive Trait Scan (prohibited demographic terms)
     │
     └── 5. Grounding Audit (every entity must trace to a verified evidence node)
```
