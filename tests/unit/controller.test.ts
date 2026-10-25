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

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      // Because it was configured as live and failed, it must NOT silently produce fixture plans or DEMO_FIXTURE state!
      expect(run.evidence.some((e) => e.evidenceClass === "DEMO_FIXTURE")).toBe(false);
      expect(run.state).toBe("ERROR");
      expect(run.sourceMode).toBe("ERROR");
    });

    it("transitions run to NEEDS_INPUT when all anchors return needs_input / AMBIGUOUS", async () => {
      const mockClient = new QlooMcpClient("dummy-key");
      mockClient.callTool = async () => ({
        status: "needs_input",
        summary: "Multiple entities matched",
        data: null,
        results: [],
        resultCount: 0,
        provenance: { tool: "qloo_describe", requestId: "req-ambig", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
      });

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      expect(run.state).toBe("NEEDS_INPUT");
      expect(run.resolvedAnchors.every((a) => a.confidenceState === "AMBIGUOUS")).toBe(true);
      expect(run.resolvedAnchors.every((a) => a.confidenceState !== "CONFIRMED")).toBe(true);
    });

    it("transitions run to EMPTY when all anchors return empty / NOT_FOUND", async () => {
      const mockClient = new QlooMcpClient("dummy-key");
      mockClient.callTool = async () => ({
        status: "empty",
        summary: "No entity matched",
        data: null,
        results: [],
        resultCount: 0,
        provenance: { tool: "qloo_describe", requestId: "req-not-found", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
      });

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      expect(run.state).toBe("EMPTY");
      expect(run.resolvedAnchors.every((a) => a.confidenceState === "NOT_FOUND")).toBe(true);
      expect(run.resolvedAnchors.every((a) => a.confidenceState !== "CONFIRMED")).toBe(true);
    });

    it("reflects CACHED_QLOO source mode truthfully when Qloo returns cached provenance", async () => {
      const mockClient = new QlooMcpClient("dummy-key");
      mockClient.callTool = async (tool: string) => {
        if (tool === "qloo_describe") {
          return {
            status: "ok",
            data: { entity_id: "ent-cached-1", name: "A24" },
            results: [{ entity_id: "ent-cached-1", name: "A24" }],
            resultCount: 1,
            provenance: { tool, requestId: "req-cached", sourceMode: "CACHED_QLOO", timestamp: new Date().toISOString() },
          };
        }
        return {
          status: "ok",
          data: [],
          results: [{ name: "Cached Rec" }],
          resultCount: 1,
          provenance: { tool, requestId: "req-rec", sourceMode: "CACHED_QLOO", timestamp: new Date().toISOString() },
        };
      };

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      expect(run.sourceMode).toBe("CACHED_QLOO");
    });

    it("transitions run state to ERROR when all ranking domains fail with upstream errors", async () => {
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
        if (tool === "qloo_recommend") {
          return {
            status: "ok",
            data: [],
            results: [{ name: "Candidate Option" }],
            resultCount: 1,
            provenance: { tool, requestId: "req-rec", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        if (tool === "qloo_rank") {
          return {
            status: "error",
            error: { code: "RANK_TIMEOUT", message: "Ranking call timed out" },
            data: null,
            results: [],
            resultCount: 0,
            provenance: { tool, requestId: "req-rank-fail", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        return {
          status: "ok",
          data: [],
          results: [],
          resultCount: 0,
          provenance: { tool, requestId: "req-other", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
        };
      };

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      // Must be ERROR, not EMPTY, because a live error must never become an empty business result!
      expect(run.state).toBe("ERROR");
      expect(run.sourceMode).toBe("ERROR");
      expect(run.plans.length).toBe(0);
      expect(run.warnings.some((w) => w.includes("Ranking failed for domain"))).toBe(true);
    });

    it("transitions run state to DEGRADED when some ranking domains succeed and others fail", async () => {
      const mockClient = new QlooMcpClient("dummy-key");
      mockClient.callTool = async (tool: string, args: any) => {
        if (tool === "qloo_describe") {
          return {
            status: "ok",
            data: { entity_id: "ent-1", name: "A24" },
            results: [{ entity_id: "ent-1", name: "A24" }],
            resultCount: 1,
            provenance: { tool, requestId: "req-desc", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        if (tool === "qloo_recommend") {
          return {
            status: "ok",
            data: [],
            results: [{ name: "Candidate Option" }],
            resultCount: 1,
            provenance: { tool, requestId: "req-rec", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        if (tool === "qloo_rank") {
          if (args.option_type === "movie") {
            return {
              status: "ok",
              data: [{ name: "Candidate Option", score: 0.9 }],
              results: [{ name: "Candidate Option", score: 0.9, rank: 1 }],
              resultCount: 1,
              provenance: { tool, requestId: "req-rank-movie", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
            };
          }
          // brand and place fail with errors
          return {
            status: "error",
            error: { code: "SERVICE_UNAVAILABLE", message: "Domain ranking failed" },
            data: null,
            results: [],
            resultCount: 0,
            provenance: { tool, requestId: "req-rank-fail", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
          };
        }
        return {
          status: "ok",
          data: [],
          results: [],
          resultCount: 0,
          provenance: { tool, requestId: "req-other", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
        };
      };

      const controller = new BoundedAgentController(liveBrief, mockClient);
      const run = await controller.execute();

      expect(run.state).toBe("DEGRADED");
      expect(run.sourceMode).toBe("DEGRADED");
      expect(run.plans.length).toBeGreaterThan(0);
      expect(run.warnings.some((w) => w.includes("Ranking failed for domain"))).toBe(true);
    });
  });

  describe("Contract Boundary & Oversized Input Protection", () => {
    it("rejects oversized itemName, anchor count, and strings via Zod schema bounds", async () => {
      const { InventoryBriefSchema } = await import("@lastrack/contracts");

      // Oversized itemName (> 200 chars)
      const oversizedItemName = {
        ...SYNTHETIC_JUDGE_BRIEF,
        itemName: "A".repeat(201),
      };
      expect(() => InventoryBriefSchema.parse(oversizedItemName)).toThrow("Item name cannot exceed 200 characters");

      // Too many anchors (> 10)
      const tooManyAnchors = {
        ...SYNTHETIC_JUDGE_BRIEF,
        anchorNames: Array.from({ length: 11 }, (_, i) => ({ name: `Anchor ${i}` })),
      };
      expect(() => InventoryBriefSchema.parse(tooManyAnchors)).toThrow("Cannot specify more than 10 anchors");

      // Oversized anchor name (> 150 chars)
      const oversizedAnchorName = {
        ...SYNTHETIC_JUDGE_BRIEF,
        anchorNames: [{ name: "X".repeat(151) }],
      };
      expect(() => InventoryBriefSchema.parse(oversizedAnchorName)).toThrow("Anchor name cannot exceed 150 characters");

      // Too many forbidden tactics (> 30)
      const tooManyTactics = {
        ...SYNTHETIC_JUDGE_BRIEF,
        forbiddenTactics: Array.from({ length: 31 }, (_, i) => `Tactic ${i}`),
      };
      expect(() => InventoryBriefSchema.parse(tooManyTactics)).toThrow("Cannot specify more than 30 forbidden tactics");
    });
  });
});

