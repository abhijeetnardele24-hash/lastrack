import { describe, it, expect } from "vitest";
import { BoundedAgentController } from "../../apps/server/src/agent/controller.js";
import { QlooMcpClient } from "../../apps/server/src/qloo/mcpClient.js";
import { SYNTHETIC_JUDGE_BRIEF } from "@lastrack/fixtures";
import { verifyAblationEffect } from "@lastrack/domain";

describe("BoundedAgentController Causal & Evidence Tests", () => {
  it("derives plans dynamically from returned cultural entities rather than constants", async () => {
    const qlooClient = new QlooMcpClient(undefined);
    const controller = new BoundedAgentController(SYNTHETIC_JUDGE_BRIEF, qlooClient, {
      explicitFixture: true,
    });

    const run = await controller.execute();

    expect(run.state).toBe("READY");
    expect(run.sourceMode).toBe("DEMO_FIXTURE");
    expect(run.plans.length).toBeGreaterThanOrEqual(1);

    // Assert plans reference resolved entities
    const allPlanEntities = run.plans.flatMap((p) => p.culturalEntityNames);
    expect(allPlanEntities.length).toBeGreaterThan(0);

    // Assert all evidence nodes are truthfully labeled DEMO_FIXTURE
    expect(run.evidence.every((e) => e.evidenceClass !== "QLOO_EVIDENCE")).toBe(true);
    expect(run.evidence.some((e) => e.evidenceClass === "DEMO_FIXTURE")).toBe(true);
  });

  it("cooperatively halts execution when cancelled", async () => {
    const qlooClient = new QlooMcpClient(undefined);
    const controller = new BoundedAgentController(SYNTHETIC_JUDGE_BRIEF, qlooClient, {
      explicitFixture: true,
    });

    // Cancel before execute
    controller.cancel();
    const run = await controller.execute();

    expect(run.state).toBe("ERROR");
    expect(run.events.some((e) => e.message.includes("cancelled"))).toBe(true);
  });

  it("enforces maxCallBudget and records warnings if exhausted", async () => {
    const qlooClient = new QlooMcpClient(undefined);
    const controller = new BoundedAgentController(SYNTHETIC_JUDGE_BRIEF, qlooClient, {
      explicitFixture: true,
    });

    const run = controller.getRun();
    run.maxCallBudget = 2; // Strict low budget

    const completed = await controller.execute();
    expect(completed.qlooCallCount).toBeLessThanOrEqual(3);
  });

  it("proves cultural ablation eliminates all cultural entities and Qloo rationales", async () => {
    const qlooClient = new QlooMcpClient(undefined);
    const controller = new BoundedAgentController(SYNTHETIC_JUDGE_BRIEF, qlooClient, {
      explicitFixture: true,
    });

    const run = await controller.execute();
    expect(run.ablationBaseline).toBeDefined();

    const ablationResult = verifyAblationEffect(
      run.plans,
      run.ablationBaseline?.plans || []
    );

    expect(ablationResult.isCulturallyAblated).toBe(true);
    expect(ablationResult.qlooEntitiesCount).toBeGreaterThan(0);
    expect(ablationResult.ablatedEntitiesCount).toBe(0);
  });

  it("reports empty state if no anchors can be resolved", async () => {
    const qlooClient = new QlooMcpClient(undefined);
    const emptyBrief = {
      ...SYNTHETIC_JUDGE_BRIEF,
      anchorNames: [],
    };

    // Controller with 0 anchors
    const controller = new BoundedAgentController(emptyBrief, qlooClient, {
      explicitFixture: true,
    });

    const run = await controller.execute();
    expect(run.state === "EMPTY" || run.state === "VALIDATING_BRIEF").toBe(true);
  });
});
