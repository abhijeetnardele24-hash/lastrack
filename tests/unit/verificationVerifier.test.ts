import { describe, it, expect } from "vitest";
// @ts-expect-error CommonJS module import in ESM/TS test
import { verifyEvidence, CANONICAL_CHECKSUM, REQUIRED_TOOLS } from "../../scripts/generate-verification-results.cjs";

function createValidCommittedData(overrides = {}) {
  return {
    repository: "lastrack",
    generatedAt: new Date().toISOString(),
    testedImplementationCommit: "a599df9aa6ef317303074734771189b4d1953b5f",
    artifactGeneratedFromCommit: "a599df9aa6ef317303074734771189b4d1953b5f",
    carrierCommitVerifiedAtRuntime: "CALCULATED_AT_RUNTIME",
    branch: "main",
    canonicalQlooContract: {
      protocolVersion: "2024-11-05",
      contractVersion: "1.0.0",
      harnessPackage: "@qloo/qloo-harness@0.1.26",
      checksum: CANONICAL_CHECKSUM,
      executableCommand: "node dist/bin.js mcp",
      requiredOperations: ["describe", "find_tags", "recommend", "rank"],
      supportedTools: [...REQUIRED_TOOLS],
      mcpContractTest: {
        status: "PASSED",
        harnessVersion: "0.1.26",
        protocolVersion: "2024-11-05",
        canonicalChecksum: CANONICAL_CHECKSUM,
        adapterReady: true,
        supportedOperations: ["describe", "find_tags", "recommend", "rank"],
        toolsList: [...REQUIRED_TOOLS],
      },
      rankingInvariant: "One qloo_rank batch per comparable entity domain",
      singleQueryRankingInvariantEnforced: true,
      integrityDigestType: "SHA-256",
    },
    qualityGates: {
      gate1_lint: {
        command: "npm run lint",
        status: "PASSED",
        errorCount: 0,
        warningCount: 0,
        filesChecked: 35,
        details: "ESLint clean",
      },
      gate2_typecheck: {
        command: "npm run typecheck",
        status: "PASSED",
        packagesChecked: ["@lastrack/contracts", "@lastrack/domain", "@lastrack/fixtures", "@lastrack/server", "@lastrack/web"],
        errorCount: 0,
        details: "TypeScript clean",
      },
      gate3_unit_tests: {
        command: "npm test",
        status: "PASSED",
        testsTotal: 72,
        testsPassed: 72,
        testsFailed: 0,
        testsSkipped: 0,
        coverage: {
          lines: 82.9,
          statements: 82.9,
          functions: 89.36,
          branches: 71.66,
        },
      },
      gate4_monorepo_build: {
        command: "npm run build",
        status: "PASSED",
        artifacts: ["apps/web/dist/index.html", "apps/server/dist/server.js"],
      },
      gate5_playwright_e2e: {
        command: "npm run test:e2e",
        status: "PASSED",
        testsTotal: 26,
        testsPassed: 26,
        testsFailed: 0,
        testsSkipped: 0,
        projects: ["Desktop Chromium", "Mobile Chrome"],
      },
      gate6_accessibility_axe: {
        tool: "@axe-core/playwright",
        status: "PASSED",
        totalTestedStates: 5,
        totalViolations: 0,
        testedStates: ["initial_state", "complete_state", "ablation_modal", "receipt_modal", "evidence_drawer"],
        statement: "Zero violations",
      },
      gate7_security_secrets: {
        command: "npm run security-scan",
        status: "PASSED",
        scope: "Working tree and git history",
        totalViolations: 0,
      },
      gate8_dependency_audit: {
        command: "npm audit --omit=dev --audit-level=high",
        status: "NOT_CLEAN",
        gateResult: "WARN",
        totalVulnerabilities: 5,
        highVulnerabilities: 3,
        moderateVulnerabilities: 2,
        criticalVulnerabilities: 0,
        packageChains: [],
      },
    },
    verificationBoundaries: {
      dockerStatus: "NOT_VERIFIED",
      liveIntegrationStatus: "NOT_VERIFIED (No live QLOO_API_KEY configured in test session)",
      deployment: {
        status: "LOCAL_VERIFIED_ONLY",
      },
    },
    ...overrides,
  };
}

function createMatchingReparsedArtifacts(overrides = {}) {
  return {
    rawArtifactTimestamps: {
      "test-results/lint-results.json": Date.now(),
      "test-results/vitest-results.json": Date.now(),
    },
    lint: {
      status: "PASSED",
      errorCount: 0,
      warningCount: 0,
      filesChecked: 35,
      details: "ESLint clean",
    },
    typecheck: {
      status: "PASSED",
      errorCount: 0,
      packagesChecked: ["@lastrack/contracts", "@lastrack/domain", "@lastrack/fixtures", "@lastrack/server", "@lastrack/web"],
      details: "TypeScript clean",
    },
    build: {
      status: "PASSED",
      artifacts: ["apps/web/dist/index.html", "apps/server/dist/server.js"],
      details: "Built clean",
    },
    contractTest: {
      status: "PASSED",
      harnessVersion: "0.1.26",
      protocolVersion: "2024-11-05",
      canonicalChecksum: CANONICAL_CHECKSUM,
      adapterReady: true,
      supportedOperations: ["describe", "find_tags", "recommend", "rank"],
      toolsList: [...REQUIRED_TOOLS],
    },
    vitest: {
      status: "PASSED",
      testsTotal: 72,
      testsPassed: 72,
      testsFailed: 0,
      testsSkipped: 0,
    },
    coverage: {
      lines: 82.9,
      statements: 82.9,
      functions: 89.36,
      branches: 71.66,
    },
    playwright: {
      status: "PASSED",
      testsTotal: 26,
      testsPassed: 26,
      testsFailed: 0,
      testsSkipped: 0,
      projects: ["Desktop Chromium", "Mobile Chrome"],
    },
    axe: {
      status: "PASSED",
      totalTestedStates: 5,
      totalViolations: 0,
      testedStates: ["initial_state", "complete_state", "ablation_modal", "receipt_modal", "evidence_drawer"],
      statement: "Zero violations",
    },
    securityScan: {
      status: "PASSED",
      totalViolations: 0,
      scope: "Working tree and git history",
    },
    dependencyAudit: {
      status: "NOT_CLEAN",
      gateResult: "WARN",
      totalVulnerabilities: 5,
      highVulnerabilities: 3,
      moderateVulnerabilities: 2,
      criticalVulnerabilities: 0,
      packageChains: [],
    },
    liveSmoke: {
      exists: false,
      passed: false,
      details: null,
    },
    ...overrides,
  };
}

describe("Verification Results Comparative Verifier Regression Suite", () => {
  it("accepts valid, exact-matching committed evidence and reparsed artifacts", () => {
    const committed = createValidCommittedData();
    const reparsed = createMatchingReparsedArtifacts();

    const result = verifyEvidence(committed, reparsed, {
      installedHarnessVersion: "0.1.26",
      carrierHead: committed.testedImplementationCommit,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects changed coverage values", () => {
    const committed = createValidCommittedData();
    const reparsed = createMatchingReparsedArtifacts({
      coverage: {
        lines: 82.9,
        statements: 82.9,
        functions: 89.36,
        branches: 75.0, // altered from 71.66
      },
    });

    const result = verifyEvidence(committed, reparsed, {
      installedHarnessVersion: "0.1.26",
      carrierHead: committed.testedImplementationCommit,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("Coverage branches mismatch"))).toBe(true);
  });

  it("rejects stale test totals", () => {
    const committed = createValidCommittedData();
    const reparsed = createMatchingReparsedArtifacts({
      vitest: {
        status: "PASSED",
        testsTotal: 70, // altered from 72
        testsPassed: 70,
        testsFailed: 0,
        testsSkipped: 0,
      },
    });

    const result = verifyEvidence(committed, reparsed, {
      installedHarnessVersion: "0.1.26",
      carrierHead: committed.testedImplementationCommit,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("Vitest testsTotal mismatch"))).toBe(true);
  });

  it("rejects missing or skipped tests in Vitest or Playwright", () => {
    const committed = createValidCommittedData();
    const reparsedWithSkippedVitest = createMatchingReparsedArtifacts({
      vitest: {
        status: "PASSED",
        testsTotal: 72,
        testsPassed: 71,
        testsFailed: 0,
        testsSkipped: 1, // unexpectedly skipped
      },
    });

    const result1 = verifyEvidence(committed, reparsedWithSkippedVitest, {
      installedHarnessVersion: "0.1.26",
      carrierHead: committed.testedImplementationCommit,
    });
    expect(result1.valid).toBe(false);
    expect(result1.errors.some((e: string) => e.includes("Vitest contains unexpectedly skipped tests"))).toBe(true);

    const reparsedWithSkippedPw = createMatchingReparsedArtifacts({
      playwright: {
        status: "PASSED",
        testsTotal: 26,
        testsPassed: 25,
        testsFailed: 0,
        testsSkipped: 1, // unexpectedly skipped
        projects: ["Desktop Chromium", "Mobile Chrome"],
      },
    });

    const result2 = verifyEvidence(committed, reparsedWithSkippedPw, {
      installedHarnessVersion: "0.1.26",
      carrierHead: committed.testedImplementationCommit,
    });
    expect(result2.valid).toBe(false);
    expect(result2.errors.some((e: string) => e.includes("Playwright contains unexpectedly skipped tests"))).toBe(true);
  });

  it("rejects a false PASSED dependency audit when active vulnerabilities exist", () => {
    const committed = createValidCommittedData();
    // Falsely claims PASSED in committed JSON
    committed.qualityGates.gate8_dependency_audit.status = "PASSED";

    const reparsed = createMatchingReparsedArtifacts();

    const result = verifyEvidence(committed, reparsed, {
      installedHarnessVersion: "0.1.26",
      carrierHead: committed.testedImplementationCommit,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("falsely claims PASSED while active vulnerabilities exist"))).toBe(true);
  });

  it("rejects missing MCP tools from either contract artifact or supportedTools", () => {
    const committed = createValidCommittedData();
    const reparsed = createMatchingReparsedArtifacts({
      contractTest: {
        status: "PASSED",
        harnessVersion: "0.1.26",
        protocolVersion: "2024-11-05",
        canonicalChecksum: CANONICAL_CHECKSUM,
        adapterReady: true,
        supportedOperations: ["describe", "find_tags", "recommend", "rank"],
        toolsList: ["qloo_describe", "qloo_find_tags", "qloo_capabilities"], // missing qloo_rank and qloo_recommend
      },
    });

    const result = verifyEvidence(committed, reparsed, {
      installedHarnessVersion: "0.1.26",
      carrierHead: committed.testedImplementationCommit,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("missing required tool: qloo_recommend"))).toBe(true);
  });

  it("rejects an unrelated or overly distant carrier commit", () => {
    const committed = createValidCommittedData({
      testedImplementationCommit: "0000000000000000000000000000000000000000",
    });
    const reparsed = createMatchingReparsedArtifacts();

    const result = verifyEvidence(committed, reparsed, {
      installedHarnessVersion: "0.1.26",
      carrierHead: "1111111111111111111111111111111111111111",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("unrelated") || e.includes("fatal") || e.includes("more than 1 commit ahead"))).toBe(true);
  });

  it("rejects claimed live Qloo execution without a successful live-smoke artifact", () => {
    const committed = createValidCommittedData();
    committed.verificationBoundaries.liveIntegrationStatus = "LIVE_QLOO_VERIFIED"; // falsely claims live Qloo verified

    const reparsed = createMatchingReparsedArtifacts({
      liveSmoke: {
        exists: false, // no smoke file
        passed: false,
        details: null,
      },
    });

    const result = verifyEvidence(committed, reparsed, {
      installedHarnessVersion: "0.1.26",
      carrierHead: committed.testedImplementationCommit,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("Claimed live Qloo execution without a successful live-smoke artifact"))).toBe(true);
  });
});
