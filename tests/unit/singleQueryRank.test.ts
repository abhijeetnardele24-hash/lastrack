import { describe, it, expect } from "vitest";
import { validateSingleQueryRankingInvariant } from "@lastrack/domain";
import { DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { ActivationPlan } from "@lastrack/contracts";

describe("singleQueryRank invariant", () => {
  it("passes when all plans are grounded in the same batch rank call", () => {
    const plans: ActivationPlan[] = DEMO_AGENT_RUN.plans.map((p) => ({
      ...p,
      scoreContext: {
        batchRankCallId: "qloo-batch-req-001",
        querySignalEntityIds: ["a24-ent-01", "bode-ent-02"],
        affinityScore: 0.88,
        rankInBatch: 1,
      },
    }));

    const result = validateSingleQueryRankingInvariant(plans);
    expect(result.valid).toBe(true);
    expect(result.batchIds).toEqual(["qloo-batch-req-001"]);
    expect(result.error).toBeUndefined();
  });

  it("fails invariant when plans reference distinct batch rank call IDs", () => {
    const mixedPlans: ActivationPlan[] = [
      {
        ...DEMO_AGENT_RUN.plans[0],
        scoreContext: {
          batchRankCallId: "batch-call-A",
          querySignalEntityIds: ["a24-ent-01"],
          affinityScore: 0.91,
          rankInBatch: 1,
        },
      },
      {
        ...DEMO_AGENT_RUN.plans[1],
        scoreContext: {
          batchRankCallId: "batch-call-B",
          querySignalEntityIds: ["phoebe-ent-02"],
          affinityScore: 0.84,
          rankInBatch: 1,
        },
      },
    ];

    const result = validateSingleQueryRankingInvariant(mixedPlans);
    expect(result.valid).toBe(false);
    expect(result.batchIds.length).toBe(2);
    expect(result.error).toContain("Cross-request comparison detected");
  });

  it("passes when plans omit scoreContext or share zero batch IDs", () => {
    const plansWithoutScores: ActivationPlan[] = DEMO_AGENT_RUN.plans.map((p) => ({
      ...p,
      scoreContext: undefined,
    }));

    const result = validateSingleQueryRankingInvariant(plansWithoutScores);
    expect(result.valid).toBe(true);
    expect(result.batchIds).toEqual([]);
  });
});
