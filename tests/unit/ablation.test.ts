import { describe, it, expect } from "vitest";
import { generateAblatedBaseline, computeAblationComparison } from "@lastrack/domain";
import { SYNTHETIC_JUDGE_BRIEF, DEMO_AGENT_RUN } from "@lastrack/fixtures";

describe("ablation comparison", () => {
  const brief = SYNTHETIC_JUDGE_BRIEF;
  const qlooPlans = DEMO_AGENT_RUN.plans;
  const evidenceNodes = DEMO_AGENT_RUN.evidence;

  it("generates ablated baseline that removes cultural intelligence", () => {
    const { plans, reason } = generateAblatedBaseline(brief, evidenceNodes);

    expect(plans.length).toBe(3);
    expect(reason).toContain("When Qloo taste intelligence is disabled");

    for (const plan of plans) {
      // Ablated plans must have 0 cultural entity references
      expect(plan.culturalEntityNames).toEqual([]);
      // Must only link to MERCHANT_INPUT evidence, not QLOO_EVIDENCE
      expect(
        plan.evidenceNodeIds.every((id) => {
          const node = evidenceNodes.find((n) => n.id === id);
          return node?.evidenceClass === "MERCHANT_INPUT";
        })
      ).toBe(true);
    }
  });

  it("computes comparative metrics showing the necessity of Qloo taste intelligence", () => {
    const comparison = computeAblationComparison(qlooPlans, evidenceNodes, brief);

    expect(comparison.qlooEnabledPlans.length).toBe(3);
    expect(comparison.qlooAblatedPlans.length).toBe(3);
    expect(comparison.qlooEvidenceCount).toBeGreaterThan(0);
    expect(comparison.distinctCulturalEntitiesCount).toBeGreaterThan(0);
    expect(comparison.differenceSummary.length).toBe(3);
    expect(comparison.differenceSummary[0]).toContain("With Qloo");
  });
});
