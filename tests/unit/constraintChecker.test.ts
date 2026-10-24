import { describe, it, expect } from "vitest";
import { evaluateConstraints } from "@lastrack/domain";
import { SYNTHETIC_JUDGE_BRIEF, DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { ActivationPlan } from "@lastrack/contracts";

describe("constraintChecker", () => {
  const brief = SYNTHETIC_JUDGE_BRIEF;
  const samplePlan = DEMO_AGENT_RUN.plans[0];

  it("passes when plan estimated cost is within budget cap", () => {
    const plan: ActivationPlan = {
      ...samplePlan,
      estimatedCost: 250, // brief budget cap is 600
    };

    const checks = evaluateConstraints(plan, brief);
    const budgetCheck = checks.find((c) => c.rule === "BUDGET_CAP");
    expect(budgetCheck).toBeDefined();
    expect(budgetCheck?.status).toBe("PASS");
  });

  it("fails when plan estimated cost exceeds budget cap", () => {
    const plan: ActivationPlan = {
      ...samplePlan,
      estimatedCost: 1200, // brief budget cap is 600
    };

    const checks = evaluateConstraints(plan, brief);
    const budgetCheck = checks.find((c) => c.rule === "BUDGET_CAP");
    expect(budgetCheck).toBeDefined();
    expect(budgetCheck?.status).toBe("FAIL");
    expect(budgetCheck?.detail).toContain("exceeds merchant cap");
  });

  it("fails when a prohibited merchant tactic is incorporated", () => {
    // brief.forbiddenTactics includes "Paid Meta ads", "TikTok dance campaign", etc.
    const plan: ActivationPlan = {
      ...samplePlan,
      actions: ["Launch a paid influencer campaign to promote the item"],
    };

    const checks = evaluateConstraints(plan, brief);
    const tacticCheck = checks.find((c) => c.rule === "FORBIDDEN_TACTICS");
    expect(tacticCheck).toBeDefined();
    expect(tacticCheck?.status).toBe("FAIL");
    expect(tacticCheck?.detail).toContain("paid influencer campaign");
  });

  it("passes when no prohibited merchant tactics are present", () => {
    const checks = evaluateConstraints(samplePlan, brief);
    const tacticCheck = checks.find((c) => c.rule === "FORBIDDEN_TACTICS");
    expect(tacticCheck).toBeDefined();
    expect(tacticCheck?.status).toBe("PASS");
  });

  it("checks experiment execution window feasibility", () => {
    const checks = evaluateConstraints(samplePlan, brief);
    const windowCheck = checks.find((c) => c.rule === "EXECUTION_WINDOW");
    expect(windowCheck).toBeDefined();
    expect(windowCheck?.status).toBe("PASS");
    expect(windowCheck?.detail).toContain(`${brief.testWindowDays}-day`);
  });
});
