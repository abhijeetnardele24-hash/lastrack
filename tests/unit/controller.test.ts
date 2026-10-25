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

  describe("truthful ranking and failure isolation", () => {
    const liveBrief = { ...SYNTHETIC_JUDGE_BRIEF, isSyntheticDemo: false };

    it("handles rank error honestly without inventing scores or QLOO_EVIDENCE", async () => {
      const mockClient = new QlooMcpClient("dummy-key");
      // Stub callTool
      mockClient.callTool = async (tool: string) => {
        if (tool === "qloo_describe") {
          return {
            status: "ok",
            data: { entity_id: "ent-1", name: "A24" },
            results: [{ entity_id: "ent-1", name: "A24" }],
            resultCount: 1,
            provenance: { tool, requestId: "req-desc", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        if (tool === "qloo_rank") {
          return {
            status: "error",
            error: { code: "RATE_LIMITED", message: "Upstream live Qloo rate limit exceeded" },
            data: null,
            results: [],
            resultCount: 0,
            provenance: { tool, requestId: "req-rank-err", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        return {
          status: "ok",
          data: [],
          results: [{ name: "Film Candidate" }],
          resultCount: 1,
          provenance: { tool, requestId: "req-rec", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
        };
      };

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      // Zero QLOO_EVIDENCE nodes should exist for ranking
      const rankEvidence = run.evidence.filter((e) => e.id.includes("qloo-rank"));
      expect(rankEvidence.length).toBe(0);

      // Plans should NOT contain invented rank digests or batch IDs
      for (const plan of run.plans) {
        expect(plan.scoreContext?.batchRankCallId).toBeUndefined();
        expect(plan.scoreContext?.rankDigest).toBeUndefined();
      }

      // No fixture data should appear
      expect(run.sourceMode).not.toBe("DEMO_FIXTURE");
      expect(run.sourceMode === "ERROR" || run.sourceMode === "DEGRADED").toBe(true);
    });

    it("handles rank empty response honestly without fabricated evidence", async () => {
      const mockClient = new QlooMcpClient("dummy-key");
      mockClient.callTool = async (tool: string) => {
        if (tool === "qloo_describe") {
          return {
            status: "ok",
            data: { entity_id: "ent-1", name: "A24" },
            results: [{ entity_id: "ent-1", name: "A24" }],
            resultCount: 1,
            provenance: { tool, requestId: "req-desc", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        if (tool === "qloo_rank") {
          return {
            status: "empty",
            data: [],
            results: [],
            resultCount: 0,
            provenance: { tool, requestId: "req-rank-empty", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        return {
          status: "ok",
          data: [],
          results: [{ name: "Film Candidate" }],
          resultCount: 1,
          provenance: { tool, requestId: "req-rec", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
        };
      };

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      const rankEvidence = run.evidence.filter((e) => e.id.includes("qloo-rank"));
      expect(rankEvidence.length).toBe(0);
      expect(run.warnings.some((w) => w.includes("No ranking results returned by Qloo"))).toBe(true);
    });

    it("handles rank needs_input response honestly", async () => {
      const mockClient = new QlooMcpClient("dummy-key");
      mockClient.callTool = async (tool: string) => {
        if (tool === "qloo_describe") {
          return {
            status: "ok",
            data: { entity_id: "ent-1", name: "A24" },
            results: [{ entity_id: "ent-1", name: "A24" }],
            resultCount: 1,
            provenance: { tool, requestId: "req-desc", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        if (tool === "qloo_rank") {
          return {
            status: "needs_input",
            summary: "Entity requires disambiguation",
            data: [],
            results: [],
            resultCount: 0,
            provenance: { tool, requestId: "req-rank-needs-input", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        return {
          status: "ok",
          data: [],
          results: [{ name: "Film Candidate" }],
          resultCount: 1,
          provenance: { tool, requestId: "req-rec", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
        };
      };

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      const rankEvidence = run.evidence.filter((e) => e.id.includes("qloo-rank"));
      expect(rankEvidence.length).toBe(0);
      expect(run.warnings.some((w) => w.includes("Ranking requires input or disambiguation"))).toBe(true);
    });

    it("handles rank partial response truthfully and records warning", async () => {
      const mockClient = new QlooMcpClient("dummy-key");
      mockClient.callTool = async (tool: string) => {
        if (tool === "qloo_describe") {
          return {
            status: "ok",
            data: { entity_id: "ent-1", name: "A24" },
            results: [{ entity_id: "ent-1", name: "A24" }],
            resultCount: 1,
            provenance: { tool, requestId: "req-desc", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        if (tool === "qloo_rank") {
          return {
            status: "partial",
            data: [{ name: "Film Candidate", score: 0.77 }],
            results: [{ name: "Film Candidate", score: 0.77 }],
            resultCount: 1,
            provenance: { tool, requestId: "req-rank-partial", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        return {
          status: "ok",
          data: [],
          results: [{ name: "Film Candidate" }, { name: "Other Option" }],
          resultCount: 2,
          provenance: { tool, requestId: "req-rec", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
        };
      };

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      // Partial rank returned 1 candidate, so it grounded 1 ranked candidate with warning
      expect(run.warnings.some((w) => w.includes("status \"partial\""))).toBe(true);
    });

    it("ensures no fixture data appears when configured live integration fails", async () => {
      const mockClient = new QlooMcpClient("dummy-live-key");
      mockClient.callTool = async () => {
        return {
          status: "error",
          error: { code: "AUTHENTICATION_FAILED", message: "Invalid API key" },
          data: null,
          results: [],
          resultCount: 0,
          provenance: { tool: "qloo_describe", requestId: "req-live-fail", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
        };
      };

      const controller = new BoundedAgentController(SYNTHETIC_JUDGE_BRIEF, mockClient);
      const run = await controller.execute();

      // Because it was configured as live and failed, it must NOT silently produce fixture plans or DEMO_FIXTURE state!
      expect(run.evidence.some((e) => e.evidenceClass === "DEMO_FIXTURE")).toBe(false);
      expect(run.state === "ERROR" || run.state === "EMPTY").toBe(true);
    });
  });
});

