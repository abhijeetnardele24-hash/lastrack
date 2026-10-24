import { describe, it, expect } from "vitest";
import { QlooMcpClient } from "../../apps/server/src/qloo/mcpClient.js";

describe("Canonical QlooMcpClient Contract & Unit Tests", () => {
  it("computes correct configuration status from API key", () => {
    const unconfigured = new QlooMcpClient(undefined);
    expect(unconfigured.isConfigured()).toBe(false);
    expect(unconfigured.isReady()).toBe(false);

    const configured = new QlooMcpClient("dummy_api_key_test_12345");
    expect(configured.isConfigured()).toBe(true);
  });

  it("returns explicit DEMO_FIXTURE results only when allowFixture is explicitly true", async () => {
    const client = new QlooMcpClient(undefined);

    // Call without allowFixture must return error, NOT fixture data
    const denied = await client.callTool("qloo_describe", { entity: "A24", type: "brand" }, { allowFixture: false });
    expect(denied.status).toBe("error");
    expect(denied.error?.code).toBe("QLOO_AUTH");
    expect(denied.results).toEqual([]);

    // Call with explicit allowFixture returns labeled fixture
    const allowed = await client.callTool("qloo_describe", { entity: "A24", type: "brand" }, { allowFixture: true });
    expect(allowed.status).toBe("ok");
    expect(allowed.provenance.sourceMode).toBe("DEMO_FIXTURE");
    expect(allowed.results.length).toBeGreaterThan(0);
    expect(allowed.results[0].name).toBe("A24");
  });

  it("handles canonical qloo_find_tags schema with natural query", async () => {
    const client = new QlooMcpClient(undefined);
    const res = await client.callTool(
      "qloo_find_tags",
      { query: "washed linen overshirt", semantic: true, limit: 10 },
      { allowFixture: true }
    );

    expect(res.status).toBe("ok");
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.provenance.tool).toBe("qloo_find_tags");
  });

  it("handles canonical qloo_recommend schema per target_type", async () => {
    const client = new QlooMcpClient(undefined);
    const res = await client.callTool(
      "qloo_recommend",
      { target_type: "movie", signals: ["A24", "Phoebe Bridgers"], limit: 5 },
      { allowFixture: true }
    );

    expect(res.status).toBe("ok");
    expect(res.results.length).toBe(2);
    expect(res.results[0].type).toBe("movie");
    expect(res.results[0].name).toBe("Past Lives");
  });

  it("handles canonical qloo_rank schema with single option_type", async () => {
    const client = new QlooMcpClient(undefined);
    const options = ["Past Lives", "Aftersun"];
    const res = await client.callTool(
      "qloo_rank",
      { options, option_type: "movie", signals: ["A24"] },
      { allowFixture: true }
    );

    expect(res.status).toBe("ok");
    expect(res.results.length).toBe(2);
    expect(res.results[0].rank).toBe(1);
    expect(res.results[0].score).toBeGreaterThan(res.results[1].score);
  });

  it("caches successful tool calls within TTL window", async () => {
    const client = new QlooMcpClient(undefined, 60);
    const res1 = await client.callTool("qloo_find_tags", { query: "linen" }, { allowFixture: true });
    const res2 = await client.callTool("qloo_find_tags", { query: "linen" }, { allowFixture: true });

    expect(res1.status).toBe("ok");
    expect(res2.status).toBe("ok");
    expect(res2.provenance.sourceMode).toBe("DEMO_FIXTURE");
    expect(res2.provenance.cached).toBe(true);

    // Test that cached live Qloo entries return CACHED_QLOO
    const liveKey = (client as any).computeCacheKey("qloo_describe", { entity: "LiveBrand" });
    (client as any).cache.set(liveKey, {
      data: { status: "ok" },
      results: [{ name: "LiveBrand" }],
      resultCount: 1,
      sourceMode: "LIVE_QLOO",
      expiresAt: Date.now() + 60000,
    });
    const liveCached = await client.callTool("qloo_describe", { entity: "LiveBrand" });
    expect(liveCached.provenance.sourceMode).toBe("CACHED_QLOO");
    expect(liveCached.provenance.cached).toBe(true);
  });

  it("preserves correlation_id and provenance request tracking", async () => {
    const client = new QlooMcpClient(undefined);
    const correlationId = "test-corr-id-9988";
    const res = await client.callTool(
      "qloo_describe",
      { entity: "Bode", type: "brand" },
      { allowFixture: true, correlationId }
    );

    expect(res.provenance.correlationId).toBe(correlationId);
  });
});
