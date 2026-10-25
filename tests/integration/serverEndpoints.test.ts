import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import {
  buildServer,
  cleanupExpiredRuns,
  activeRuns,
  qlooClient,
  RUN_TTL_MS,
} from "../../apps/server/src/server.js";
import { SYNTHETIC_JUDGE_BRIEF, DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { MANDATORY_DISCLAIMER, AgentRun } from "@lastrack/contracts";

describe("Fastify Server Integration Endpoints", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    server = buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("GET /api/health returns healthy status and current sourceMode", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe("healthy");
    expect(typeof body.mcpReady).toBe("boolean");
    expect(body.sourceMode).toBeDefined();
    expect(["LIVE_QLOO", "DEMO_FIXTURE"]).toContain(body.sourceMode);
  });

  it("GET /api/meta returns system metadata and compliance guidelines", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/api/meta",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe("LastRack");
    expect(body.safeUseGuidelines).toContain("Aligned with Qloo Safe-Use");
    expect(body.qlooIndispensable).toBe(true);
  });

  it("POST /api/resolve resolves anchor using Qloo tool or fixture", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/api/resolve",
      payload: {
        name: "A24",
        expectedType: "brand",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.resolved).toBeDefined();
    expect(body.resolved.inputName).toBe("A24");
    // In unconfigured test mode, fixture mode gives DEMO_FIXTURE; if live it gives CONFIRMED
    expect(["DEMO_FIXTURE", "CONFIRMED"]).toContain(body.resolved.confidenceState);
  });

  it("POST /api/resolve rejects requests with missing anchor name", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/api/resolve",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("POST /api/runs starts a new bounded agent run", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/api/runs",
      payload: SYNTHETIC_JUDGE_BRIEF,
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.payload);
    expect(body.runId).toBeDefined();
    expect(body.state).toBeDefined();
  });

  it("POST /api/runs rejects invalid inventory brief", async () => {
    const res = await server.inject({
      method: "POST",
      url: "/api/runs",
      payload: {
        itemName: "", // invalid empty item name
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("GET /api/runs/:id retrieves existing seeded demo run", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/api/runs/${DEMO_AGENT_RUN.id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(DEMO_AGENT_RUN.id);
    expect(body.plans.length).toBe(3);
    expect(body.evidence.length).toBeGreaterThan(0);
  });

  it("GET /api/runs/:id returns 404 for non-existent run", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/api/runs/non-existent-run-id",
    });

    expect(res.statusCode).toBe(404);
  });

  it("GET /api/runs/:id/export exports decision receipt with mandatory disclaimer", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/api/runs/${DEMO_AGENT_RUN.id}/export`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.runId).toBe(DEMO_AGENT_RUN.id);
    expect(body.disclaimer).toBe(MANDATORY_DISCLAIMER);
    expect(body.selectedPlan).toBeDefined();
    expect(body.evidenceTrail.length).toBeGreaterThan(0);
  });

  it("GET /api/runs/:id/export/html exports HTML decision receipt", async () => {
    const res = await server.inject({
      method: "GET",
      url: `/api/runs/${DEMO_AGENT_RUN.id}/export/html`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.payload).toContain("Inventory Experiment Receipt");
    expect(res.payload).toContain(MANDATORY_DISCLAIMER);
  });

  describe("/api/resolve response states and truthfulness", () => {
    it("returns 502 with structured recovery info on Qloo service error", async () => {
      const origCallTool = qlooClient.callTool;
      qlooClient.callTool = async () => ({
        status: "error",
        error: { code: "SERVICE_UNAVAILABLE", message: "Live Qloo service unavailable" },
        data: null,
        results: [],
        resultCount: 0,
        provenance: { tool: "qloo_describe", requestId: "req-err-502", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
      });

      try {
        const res = await server.inject({
          method: "POST",
          url: "/api/resolve",
          payload: { name: "TroubledBrand" },
        });

        expect(res.statusCode).toBe(502);
        const body = JSON.parse(res.payload);
        expect(body.error).toBe("Bad Gateway");
        expect(body.status).toBe("error");
        expect(body.recovery?.canRetry).toBe(true);
        expect(body.provenanceId).toBe("req-err-502");
      } finally {
        qlooClient.callTool = origCallTool;
      }
    });

    it("returns 422 with disambiguation candidates when needs_input is returned", async () => {
      const origCallTool = qlooClient.callTool;
      qlooClient.callTool = async () => ({
        status: "needs_input",
        data: null,
        results: [{ name: "Brand One" }, { name: "Brand Two" }],
        resultCount: 2,
        provenance: { tool: "qloo_describe", requestId: "req-needs-422", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
      });

      try {
        const res = await server.inject({
          method: "POST",
          url: "/api/resolve",
          payload: { name: "AmbiguousBrand" },
        });

        expect(res.statusCode).toBe(422);
        const body = JSON.parse(res.payload);
        expect(body.error).toBe("Unprocessable Entity");
        expect(body.status).toBe("needs_input");
        expect(body.recovery?.candidates.length).toBe(2);
      } finally {
        qlooClient.callTool = origCallTool;
      }
    });

    it("returns 404 with recovery suggestion when entity is not found in catalog", async () => {
      const origCallTool = qlooClient.callTool;
      qlooClient.callTool = async () => ({
        status: "empty",
        data: null,
        results: [],
        resultCount: 0,
        provenance: { tool: "qloo_describe", requestId: "req-empty-404", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
      });

      try {
        const res = await server.inject({
          method: "POST",
          url: "/api/resolve",
          payload: { name: "UnknownNonexistentEntity999" },
        });

        expect(res.statusCode).toBe(404);
        const body = JSON.parse(res.payload);
        expect(body.error).toBe("Not Found");
        expect(body.status).toBe("empty");
        expect(body.recovery?.suggestion).toBeDefined();
      } finally {
        qlooClient.callTool = origCallTool;
      }
    });

    it("returns 502 when response data is malformed", async () => {
      const origCallTool = qlooClient.callTool;
      qlooClient.callTool = async () => ({
        status: "ok",
        data: null,
        results: [{}], // missing entity_id, entityId, and name
        resultCount: 1,
        provenance: { tool: "qloo_describe", requestId: "req-malformed-502", sourceMode: "LIVE_QLOO", timestamp: new Date().toISOString() },
      });

      try {
        const res = await server.inject({
          method: "POST",
          url: "/api/resolve",
          payload: { name: "MalformedEntity" },
        });

        expect(res.statusCode).toBe(502);
        const body = JSON.parse(res.payload);
        expect(body.error).toBe("Bad Gateway");
        expect(body.message).toContain("Malformed");
      } finally {
        qlooClient.callTool = origCallTool;
      }
    });
  });

  describe("TTL Run Expiration & Cleanup", () => {
    it("cleans up terminal runs older than maxAgeMs and preserves active and seed demo runs", () => {
      const now = Date.now();
      const expiredTerminalRun: AgentRun = {
        ...DEMO_AGENT_RUN,
        id: "run-expired-terminal-1",
        state: "READY",
        startedAt: now - 3600000,
        completedAt: now - 3600000,
      };
      const recentTerminalRun: AgentRun = {
        ...DEMO_AGENT_RUN,
        id: "run-recent-terminal-2",
        state: "READY",
        startedAt: now - 60000,
        completedAt: now - 60000,
      };
      const activeRunningRun: AgentRun = {
        ...DEMO_AGENT_RUN,
        id: "run-active-running-3",
        state: "RANKING_SIGNALS",
        startedAt: now - 3600000,
      };

      activeRuns.set(expiredTerminalRun.id, expiredTerminalRun);
      activeRuns.set(recentTerminalRun.id, recentTerminalRun);
      activeRuns.set(activeRunningRun.id, activeRunningRun);

      const cleaned = cleanupExpiredRuns(RUN_TTL_MS, now);
      expect(cleaned).toBeGreaterThanOrEqual(1);

      // Expired terminal run should be deleted
      expect(activeRuns.has(expiredTerminalRun.id)).toBe(false);

      // Recent terminal run and active run must be retained
      expect(activeRuns.has(recentTerminalRun.id)).toBe(true);
      expect(activeRuns.has(activeRunningRun.id)).toBe(true);

      // Seed demo run must never be deleted
      expect(activeRuns.has(DEMO_AGENT_RUN.id)).toBe(true);

      // Cleanup test runs
      activeRuns.delete(recentTerminalRun.id);
      activeRuns.delete(activeRunningRun.id);
    });
  });

  describe("Server Hardening & CORS", () => {
    it("rejects unauthorized cross-origin requests in production mode", async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const prodServer = buildServer();
      await prodServer.ready();

      try {
        const res = await prodServer.inject({
          method: "OPTIONS",
          url: "/api/health",
          headers: {
            origin: "https://malicious-site.example.com",
            "access-control-request-method": "GET",
          },
        });

        // Fastify CORS throws an error when origin is rejected, resulting in 500 error or omission of Access-Control-Allow-Origin
        expect(res.headers["access-control-allow-origin"]).toBeUndefined();
      } finally {
        await prodServer.close();
        process.env.NODE_ENV = prevEnv;
      }
    });
  });
});

