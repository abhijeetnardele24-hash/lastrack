import { describe, it, expect, afterEach } from "vitest";
import { QlooMcpClient, EXPECTED_CANONICAL_CHECKSUM, EXPECTED_PROTOCOL_VERSION, getInstalledHarnessVersion } from "../../apps/server/src/qloo/mcpClient.js";
import fs from "fs";
import path from "path";

describe("Real MCP Child-Process Contract Handshake Suite", () => {
  let client: QlooMcpClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.shutdown();
      client = null;
    }
  });

  it("verifies installed harness package version is 0.1.26", () => {
    const version = getInstalledHarnessVersion();
    expect(version).toBe("0.1.26");
  });

  it("spawns the real installed @qloo/qloo-harness binary, completes handshake, validates capabilities, and shuts down", async () => {
    // Uses dummy key strictly for capability negotiation and contract handshake without making live Qloo network calls
    client = new QlooMcpClient("dummy_contract_test_key_for_handshake");

    const initialized = await client.initialize();
    expect(initialized).toBe(true);
    expect(client.isReady()).toBe(true);

    const caps = client.getCapabilities();
    expect(caps).not.toBeNull();
    expect(caps?.contractChecksum).toBe(EXPECTED_CANONICAL_CHECKSUM);
    expect(caps?.contractVersion).toBe("1.0.0");
    expect(caps?.ready).toBe(true);
    expect(caps?.supportedOperations).toContain("describe");
    expect(caps?.supportedOperations).toContain("find_tags");
    expect(caps?.supportedOperations).toContain("recommend");
    expect(caps?.supportedOperations).toContain("rank");
    expect(caps?.toolsList).toBeDefined();
    expect(caps?.toolsList).toContain("qloo_describe");
    expect(caps?.toolsList).toContain("qloo_find_tags");
    expect(caps?.toolsList).toContain("qloo_recommend");
    expect(caps?.toolsList).toContain("qloo_rank");
    expect(caps?.toolsList).toContain("qloo_capabilities");

    await client.shutdown();
    expect(client.isReady()).toBe(false);

    // Save contract verification evidence to test-results
    const outDir = path.resolve(process.cwd(), "test-results");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(outDir, "contract-test.json"),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          status: "PASSED",
          exitCode: 0,
          harnessVersion: getInstalledHarnessVersion(),
          protocolVersion: EXPECTED_PROTOCOL_VERSION,
          canonicalChecksum: EXPECTED_CANONICAL_CHECKSUM,
          adapterReady: true,
          supportedOperations: caps?.supportedOperations,
          toolsList: caps?.toolsList,
        },
        null,
        2
      )
    );
  }, 15000);

  it("fails closed if the harness executable path is invalid", async () => {
    client = new QlooMcpClient("dummy_key", 300, "/nonexistent/path/to/binary.js");
    await expect(client.initialize()).rejects.toThrow();
    expect(client.isReady()).toBe(false);
  });
});
