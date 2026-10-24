import {
  AgentRun,
  DecisionReceipt,
  MANDATORY_DISCLAIMER,
} from "@lastrack/contracts";

import { createHash } from "crypto";

export function buildDecisionReceipt(
  run: AgentRun,
  selectedPlanId: string
): DecisionReceipt {
  const plan = run.plans.find((p) => p.id === selectedPlanId);
  if (!plan) {
    throw new Error(`Plan with id "${selectedPlanId}" not found in run "${run.id}".`);
  }

  const linkedEvidenceIds = new Set(plan.evidenceNodeIds);
  const evidenceTrail = run.evidence.filter((e) => linkedEvidenceIds.has(e.id));
  const exportedAt = new Date().toISOString();

  const receiptPayload = `${run.id}:${plan.id}:${run.brief.itemName}:${plan.title}:${MANDATORY_DISCLAIMER}:${exportedAt}`;
  const receiptDigest = `sha256:${createHash("sha256").update(receiptPayload).digest("hex")}`;

  return {
    runId: run.id,
    selectedPlanId: plan.id,
    brief: run.brief,
    selectedPlan: plan,
    evidenceTrail,
    disclaimer: MANDATORY_DISCLAIMER,
    exportedAt,
    sourceMode: run.sourceMode,
    isSyntheticDemo: run.brief.isSyntheticDemo,
    receiptDigest,
  };
}

export function generateReceiptHtml(receipt: DecisionReceipt): string {
  const { brief, selectedPlan, evidenceTrail, disclaimer, exportedAt, sourceMode } = receipt;

  const actionsList = selectedPlan.actions
    .map((a) => `<li style="margin-bottom: 6px;">${escapeHtml(a)}</li>`)
    .join("\n");

  const evidenceItems = evidenceTrail
    .map(
      (e) => `
      <div style="border-left: 2px solid #1F6B4F; padding-left: 12px; margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: 600; color: #1F6B4F; text-transform: uppercase;">${escapeHtml(e.evidenceClass)}</div>
        <div style="font-size: 13px; color: #14201C; margin-top: 2px;">${escapeHtml(e.statement)}</div>
        ${e.qlooTool ? `<div style="font-size: 11px; color: #4D5B55; margin-top: 2px;">Tool: <code>${escapeHtml(e.qlooTool)}</code></div>` : ""}
      </div>`
    )
    .join("\n");

  const constraintItems = selectedPlan.constraintChecks
    .map(
      (c) => `
      <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${c.status === "PASS" ? "#E8F5E9" : "#FFEBEE"}; color: ${c.status === "PASS" ? "#1F6B4F" : "#B94F32"}; margin-right: 6px;">
        ${escapeHtml(c.rule)}: ${c.status}
      </span>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LastRack — Inventory Experiment Receipt (${escapeHtml(selectedPlan.title)})</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #F2EFE7;
      color: #14201C;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.5;
    }
    .masthead {
      border-bottom: 2px solid #14201C;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background-color: #14201C;
      color: #F2EFE7;
      border-radius: 2px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #4D5B55;
      border-bottom: 1px solid #B9B2A5;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .disclaimer-box {
      margin-top: 32px;
      padding: 16px;
      border: 1px solid #B9B2A5;
      background: #E8E5DD;
      font-size: 12px;
      color: #4D5B55;
      font-style: italic;
    }
    @media print {
      body { background: white; padding: 20px; }
      .disclaimer-box { background: #f9f9f9; }
    }
  </style>
</head>
<body>
  <div class="masthead">
    <div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">LASTRACK</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #4D5B55;">Inventory Rescue Experiment Card</p>
    </div>
    <div style="text-align: right;">
      <span class="badge">${escapeHtml(sourceMode)}</span>
      <div style="font-size: 11px; color: #4D5B55; margin-top: 4px;">Exported: ${escapeHtml(exportedAt)}</div>
    </div>
  </div>

  <div class="section-title">Merchant Inventory Brief</div>
  <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 16px;">
    <tr>
      <td style="padding: 4px 0; color: #4D5B55; width: 140px;">Item:</td>
      <td style="padding: 4px 0; font-weight: 600;">${escapeHtml(brief.itemName)} (${escapeHtml(brief.category)})</td>
      <td style="padding: 4px 0; color: #4D5B55; width: 140px;">Units on Hand:</td>
      <td style="padding: 4px 0; font-weight: 600;">${brief.unitsOnHand} units (${brief.daysSlow} days slow)</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; color: #4D5B55;">Location:</td>
      <td style="padding: 4px 0; font-weight: 600;">${escapeHtml(brief.city)}</td>
      <td style="padding: 4px 0; color: #4D5B55;">Budget Cap:</td>
      <td style="padding: 4px 0; font-weight: 600;">$${brief.budgetCap} (Max Markdown: ${brief.maxMarkdownPercent}%)</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; color: #4D5B55;">Cultural Anchors:</td>
      <td colspan="3" style="padding: 4px 0; font-weight: 600;">${brief.anchorNames.map((a) => escapeHtml(a.name)).join(", ")}</td>
    </tr>
  </table>

  <div class="section-title">Approved Merchandising Experiment: ${escapeHtml(selectedPlan.title)}</div>
  <div style="margin-bottom: 12px;">
    <div style="font-size: 12px; font-weight: 700; color: #B94F32; text-transform: uppercase;">Mechanism: ${escapeHtml(selectedPlan.mechanism)}</div>
    <p style="font-size: 14px; margin: 6px 0 12px 0;"><strong>Hypothesis:</strong> ${escapeHtml(selectedPlan.hypothesis)}</p>
    <div>${constraintItems}</div>
  </div>

  <div style="font-size: 13px; font-weight: 700; margin-top: 16px; margin-bottom: 6px;">Action Steps:</div>
  <ol style="font-size: 13px; padding-left: 20px; margin: 0 0 16px 0;">
    ${actionsList}
  </ol>

  <div style="background: #E8E5DD; padding: 12px; border-radius: 4px; font-size: 12px; margin-bottom: 16px;">
    <span style="font-weight: 700;">Success Metric:</span> ${escapeHtml(selectedPlan.experimentMetric)}<br>
    <span style="font-weight: 700;">Stop Condition:</span> ${escapeHtml(selectedPlan.stopCondition)}<br>
    <span style="font-weight: 700;">Estimated Cost:</span> $${selectedPlan.estimatedCost}
  </div>

  <div class="section-title">Supporting Qloo Cultural Evidence Ledger (${evidenceTrail.length} nodes)</div>
  <div style="margin-top: 12px;">
    ${evidenceItems}
  </div>

  <div class="disclaimer-box">
    <strong>Mandatory Notice:</strong> ${escapeHtml(disclaimer)}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
