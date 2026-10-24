# Security Policy & Safe Use Boundary — LastRack

## 1. Reporting Security Issues
If you discover a potential security vulnerability in LastRack, please report it directly by opening an advisory or contacting the maintainer. Do not disclose vulnerabilities in public issues or pull requests.

## 2. Credential Security & Server Boundary
- **Zero Client-Side Keys:** The `QLOO_API_KEY` credential is held exclusively server-side in the backend environment. It is never transmitted to the browser, injected into client bundles, written to browser storage, or exposed via public health/meta endpoints.
- **Child Process Isolation:** The server spawns and manages the `@qloo/qloo-harness` MCP process strictly over internal stdio pipes. The MCP transport is never directly exposed over network ports.
- **Log Redaction:** All incoming and outgoing requests pass through an automated redaction filter. Authentication headers, raw API keys, and sensitive parameters are stripped before structured logging.

## 3. Data Privacy & Ethical Boundary
- **Zero Consumer Tracking:** LastRack does not ingest, store, track, or analyze individual shopper identities, personal browsing histories, payment credentials, or personal device coordinates.
- **Aggregate Taste Only:** All Qloo queries utilize aggregate cultural entity signals entered into a synthetic merchant inventory brief.
- **Prohibited Sensitive Inferences:** In strict accordance with Qloo Safe-Use guidelines, LastRack explicitly refuses and disables all inferences regarding race, ethnicity, religion, political affiliation, sexual orientation, health/medical status, financial creditworthiness, or union membership.
- **No Autonomous Commercial Action:** LastRack functions as a decision-support and hypothesis-generation tool. It never places advertisements, initiates commercial outreach, signs partnerships, or alters store prices without explicit, manual merchant authorization.

## 4. Disclaimers & Integrity
- All merchant briefs and scenarios bundled with this prototype are synthetic demonstration fixtures (`isSyntheticDemo: true`).
- Recommendations are experimental merchandising hypotheses and do not constitute legal guarantees, sales forecasts, or official endorsements by named cultural figures or brands.
