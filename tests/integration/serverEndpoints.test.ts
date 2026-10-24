import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildServer } from "../../apps/server/src/server.js";
import { SYNTHETIC_JUDGE_BRIEF, DEMO_AGENT_RUN } from "@lastrack/fixtures";
import { MANDATORY_DISCLAIMER } from "@lastrack/contracts";

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
    expect(body.resolved.confidenceState).toBe("CONFIRMED");
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
});
