import { describe, it, expect } from "vitest";
import { buildDecisionReceipt, generateReceiptHtml } from "@lastrack/domain";
import { DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { MANDATORY_DISCLAIMER } from "@lastrack/contracts";

describe("receiptBuilder", () => {
  const run = DEMO_AGENT_RUN;
  const plan = run.plans[0];

  it("builds a decision receipt containing mandatory disclaimer and evidence trail", () => {
    const receipt = buildDecisionReceipt(run, plan.id);

    expect(receipt.runId).toBe(run.id);
    expect(receipt.selectedPlanId).toBe(plan.id);
    expect(receipt.selectedPlan.title).toBe(plan.title);
    expect(receipt.disclaimer).toBe(MANDATORY_DISCLAIMER);
    expect(receipt.evidenceTrail.length).toBeGreaterThan(0);
    expect(receipt.sourceMode).toBe("DEMO_FIXTURE");
  });

  it("throws if plan id is not found in run", () => {
    expect(() => buildDecisionReceipt(run, "invalid-plan-id")).toThrow(
      'Plan with id "invalid-plan-id" not found'
    );
  });

  it("generates an HTML receipt containing critical merchant elements and disclaimer", () => {
    const receipt = buildDecisionReceipt(run, plan.id);
    const html = generateReceiptHtml(receipt);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Inventory Experiment Receipt");
    expect(html).toContain("Cinematic Workwear");
    expect(html).toContain(MANDATORY_DISCLAIMER);
    expect(html).toContain("Cultural Evidence Ledger");
    expect(html).toContain("DEMO_FIXTURE");
  });
});
