import { describe, it, expect } from "vitest";
// @ts-expect-error CommonJS module import in ESM/TS test
import {
  verifyEvidence,
  validateLintArtifact,
  validateTypecheckArtifact,
  validateBuildArtifact,
  validateVitestArtifact,
  validateCoverageArtifact,
  validatePlaywrightArtifact,
  validateAxeArtifact,
  validateSecurityScanArtifact,
  validateAuditArtifact,
  validateContractTestArtifact,
  CANONICAL_CHECKSUM,
  REQUIRED_TOOLS,
  REQUIRED_BUILD_PATHS,
} from "../../scripts/generate-verification-results.cjs";

function createValidCommittedData(overrides = {}) {
  return {
    repository: "lastrack",
    generatedAt: new Date().toISOString(),
    testedImplementationCommit: "2eb419191d7275472535a62de4e39bb9560b506d",
    artifactGeneratedFromCommit: "2eb419191d7275472535a62de4e39bb9560b506d",
    carrierCommitVerifiedAtRuntime: "CALCULATED_AT_RUNTIME",
    branch: "main",
    rawArtifactHashes: {
      "test-results/lint-results.json": "sha256:mock_lint_hash",
      "test-results/vitest-results.json": "sha256:mock_vitest_hash",
    },
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
        exitCode: 0,
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
        filesChecked: 36,
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
        testsTotal: 80,
        testsPassed: 80,
        testsFailed: 0,
        testsSkipped: 0,
        coverage: {
          lines: 82.9,
          statements: 82.9,
          functions: 89.36,
          branches: 71.72,
        },
      },
      gate4_monorepo_build: {
        command: "npm run build",
        status: "PASSED",
        artifacts: [...REQUIRED_BUILD_PATHS],
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
        scope: "Working tree files AND complete reachable Git commit history",
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
    parsingErrors: [],
    rawArtifactTimestamps: {
      "test-results/lint-results.json": Date.now(),
      "test-results/vitest-results.json": Date.now(),
    },
    lint: {
      status: "PASSED",
      exitCode: 0,
      errorCount: 0,
      warningCount: 0,
      filesChecked: 36,
      details: "ESLint clean",
    },
    typecheck: {
      status: "PASSED",
      exitCode: 0,
      errorCount: 0,
      packagesChecked: ["@lastrack/contracts", "@lastrack/domain", "@lastrack/fixtures", "@lastrack/server", "@lastrack/web"],
      details: "TypeScript clean",
    },
    build: {
      status: "PASSED",
      exitCode: 0,
      artifacts: [...REQUIRED_BUILD_PATHS],
      details: "Built clean",
    },
    contractTest: {
      status: "PASSED",
      exitCode: 0,
      harnessVersion: "0.1.26",
      protocolVersion: "2024-11-05",
      canonicalChecksum: CANONICAL_CHECKSUM,
      adapterReady: true,
      supportedOperations: ["describe", "find_tags", "recommend", "rank"],
      toolsList: [...REQUIRED_TOOLS],
    },
    vitest: {
      status: "PASSED",
      testsTotal: 80,
      testsPassed: 80,
      testsFailed: 0,
      testsSkipped: 0,
    },
    coverage: {
      lines: 82.9,
      statements: 82.9,
      functions: 89.36,
      branches: 71.72,
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
      exitCode: 0,
      totalViolations: 0,
      scope: "Working tree files AND complete reachable Git commit history",
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
  describe("1. Raw Artifact Schema Validation (Rejecting {} and incomplete JSON)", () => {
    it("rejects {} build evidence", () => {
      const res = validateBuildArtifact({});
      expect(res.valid).toBe(false);
      expect(res.errors.some((e: string) => e.includes("empty or not an object"))).toBe(true);
    });

    it("rejects build evidence with missing exit code, missing status, or empty artifact paths", () => {
      const res1 = validateBuildArtifact({ artifacts: [] });
      expect(res1.valid).toBe(false);
      expect(res1.errors.some((e: string) => e.includes("status must be explicitly PASSED"))).toBe(true);
      expect(res1.errors.some((e: string) => e.includes("missing zero numeric exitCode"))).toBe(true);
      expect(res1.errors.some((e: string) => e.includes("missing non-empty artifacts array"))).toBe(true);

      const res2 = validateBuildArtifact({ status: "PASSED", exitCode: 1, artifacts: [{ path: "apps/web/dist/index.html" }] });
      expect(res2.valid).toBe(false);
      expect(res2.errors.some((e: string) => e.includes("missing zero numeric exitCode"))).toBe(true);
      expect(res2.errors.some((e: string) => e.includes("missing required distribution path: apps/server/dist/server.js"))).toBe(true);
    });

    it("rejects {} security scan evidence", () => {
      const res = validateSecurityScanArtifact({});
      expect(res.valid).toBe(false);
      expect(res.errors.some((e: string) => e.includes("empty or not an object"))).toBe(true);
    });

    it("never converts missing security totalViolations into zero", () => {
      const res = validateSecurityScanArtifact({
        status: "PASSED",
        exitCode: 0,
        scope: "test",
        timestamp: new Date().toISOString(),
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e: string) => e.includes("totalViolations must be strictly numeric zero"))).toBe(true);
    });

    it("rejects {} and incomplete lint/typecheck artifacts", () => {
      expect(validateLintArtifact({}).valid).toBe(false);
      expect(validateTypecheckArtifact({}).valid).toBe(false);

      const invalidLint = validateLintArtifact({ status: "PASSED", filesChecked: 0 });
      expect(invalidLint.valid).toBe(false);
      expect(invalidLint.errors.some((e: string) => e.includes("missing numeric exitCode"))).toBe(true);
      expect(invalidLint.errors.some((e: string) => e.includes("missing positive numeric filesChecked"))).toBe(true);

      const invalidTypecheck = validateTypecheckArtifact({ status: "PASSED", exitCode: 0, packagesChecked: [] });
      expect(invalidTypecheck.valid).toBe(false);
      expect(invalidTypecheck.errors.some((e: string) => e.includes("missing non-empty packagesChecked array"))).toBe(true);
    });

    it("rejects {} vitest, coverage, playwright, axe, and contract artifacts", () => {
      expect(validateVitestArtifact({}).valid).toBe(false);
      expect(validateCoverageArtifact({}).valid).toBe(false);
      expect(validatePlaywrightArtifact({}).valid).toBe(false);
      expect(validateAxeArtifact({}).valid).toBe(false);
      expect(validateAuditArtifact({}).valid).toBe(false);
      expect(validateContractTestArtifact({}).valid).toBe(false);
    });
  });

  describe("2. Comparative Verification & Hash Integrity Checks", () => {
    it("accepts valid, exact-matching committed evidence and reparsed artifacts", () => {
      const committed = createValidCommittedData({ rawArtifactHashes: {} });
      const reparsed = createMatchingReparsedArtifacts();

      const result = verifyEvidence(committed, reparsed, {
        installedHarnessVersion: "0.1.26",
        carrierHead: committed.testedImplementationCommit,
      });

      // No hash errors when hashes empty
      expect(result.errors.filter((e: string) => !e.includes("rawArtifactHashes"))).toHaveLength(0);
    });

    it("rejects changed coverage values without rounding or defaults", () => {
      const committed = createValidCommittedData();
      const reparsed = createMatchingReparsedArtifacts({
        coverage: {
          lines: 82.9,
          statements: 82.9,
          functions: 89.36,
          branches: 71.66, // committed had 71.72
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
          testsTotal: 79, // altered from 80
          testsPassed: 79,
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
          testsTotal: 80,
          testsPassed: 79,
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
          exitCode: 0,
          harnessVersion: "0.1.26",
          protocolVersion: "2024-11-05",
          canonicalChecksum: CANONICAL_CHECKSUM,
          adapterReady: true,
          supportedOperations: ["describe", "find_tags", "recommend", "rank"],
          toolsList: ["qloo_describe", "qloo_find_tags", "qloo_capabilities"],
        },
      });

      const result = verifyEvidence(committed, reparsed, {
        installedHarnessVersion: "0.1.26",
        carrierHead: committed.testedImplementationCommit,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("missing required tool: qloo_recommend"))).toBe(true);
    });

    it("rejects mismatch between committed and reparsed build paths", () => {
      const committed = createValidCommittedData();
      const reparsed = createMatchingReparsedArtifacts({
        build: {
          status: "PASSED",
          exitCode: 0,
          artifacts: ["apps/web/dist/index.html"], // missing apps/server/dist/server.js
          details: "Partial",
        },
      });

      const result = verifyEvidence(committed, reparsed, {
        installedHarnessVersion: "0.1.26",
        carrierHead: committed.testedImplementationCommit,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("Build artifact paths mismatch"))).toBe(true);
    });

    it("rejects an altered raw artifact after evidence generation (hash mismatch)", () => {
      const committed = createValidCommittedData({
        rawArtifactHashes: {
          "package.json": "sha256:intentionally_corrupted_hash_to_trigger_tamper_detection",
        },
      });
      const reparsed = createMatchingReparsedArtifacts();

      const result = verifyEvidence(committed, reparsed, {
        installedHarnessVersion: "0.1.26",
        carrierHead: committed.testedImplementationCommit,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("Raw artifact hash mismatch"))).toBe(true);
    });

    it("rejects claimed live Qloo execution without a successful live-smoke artifact", () => {
      const committed = createValidCommittedData();
      committed.verificationBoundaries.liveIntegrationStatus = "LIVE_QLOO_VERIFIED";

      const reparsed = createMatchingReparsedArtifacts({
        liveSmoke: {
          exists: false,
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
});
