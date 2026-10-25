import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
// @ts-expect-error CommonJS module import in ESM/TS test
import {
  verifyEvidence,
  verifyMetadataOnly,
  generateResults,
  parseCurrentArtifacts,
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
      "test-results/lint-results.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "test-results/typecheck-results.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "test-results/build-results.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "test-results/contract-test.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "test-results/vitest-results.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "coverage/coverage-summary.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "test-results/playwright-results.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "test-results/axe-results.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "test-results/security-scan.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "test-results/npm-audit.json": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
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
        remoteRepositoryUrl: "NOT_VERIFIED",
        ciExecutionUrl: "NOT_VERIFIED",
        liveProductionUrl: "NOT_VERIFIED",
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
      const committed = createValidCommittedData();
      const reparsed = createMatchingReparsedArtifacts();

      const result = verifyEvidence(committed, reparsed, {
        installedHarnessVersion: "0.1.26",
        carrierHead: committed.testedImplementationCommit,
        skipDiskHashes: true,
      });

      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
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
        skipDiskHashes: true,
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
        skipDiskHashes: true,
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
        skipDiskHashes: true,
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
        skipDiskHashes: true,
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
        skipDiskHashes: true,
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
        skipDiskHashes: true,
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
        skipDiskHashes: true,
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
        skipDiskHashes: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes("Claimed live Qloo execution without a successful live-smoke artifact"))).toBe(true);
    });
  });

  describe("3. CI Evidence Dual-Mode Architecture Regression Suite", () => {
    function setupIsolatedCiWorkspace() {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lastrack-ci-test-"));
      fs.mkdirSync(path.join(tempDir, "test-results"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "coverage"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "apps/web/dist"), { recursive: true });
      fs.mkdirSync(path.join(tempDir, "apps/server/dist"), { recursive: true });

      // Dummy build dist files
      fs.writeFileSync(path.join(tempDir, "apps/web/dist/index.html"), "<!doctype html><html></html>");
      fs.writeFileSync(path.join(tempDir, "apps/server/dist/server.js"), "console.log('server');");

      const lintData = {
        status: "PASSED",
        exitCode: 0,
        errorCount: 0,
        warningCount: 0,
        filesChecked: 36,
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(tempDir, "test-results/lint-results.json"), JSON.stringify(lintData, null, 2));

      const typecheckData = {
        status: "PASSED",
        exitCode: 0,
        errorCount: 0,
        packagesChecked: ["@lastrack/contracts", "@lastrack/domain", "@lastrack/fixtures", "@lastrack/server", "@lastrack/web"],
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(tempDir, "test-results/typecheck-results.json"), JSON.stringify(typecheckData, null, 2));

      const buildData = {
        status: "PASSED",
        exitCode: 0,
        artifacts: ["apps/web/dist/index.html", "apps/server/dist/server.js"],
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(tempDir, "test-results/build-results.json"), JSON.stringify(buildData, null, 2));

      const contractData = {
        status: "PASSED",
        exitCode: 0,
        harnessVersion: "0.1.26",
        protocolVersion: "2024-11-05",
        canonicalChecksum: CANONICAL_CHECKSUM,
        adapterReady: true,
        supportedOperations: ["describe", "find_tags", "recommend", "rank"],
        toolsList: [...REQUIRED_TOOLS],
      };
      fs.writeFileSync(path.join(tempDir, "test-results/contract-test.json"), JSON.stringify(contractData, null, 2));

      const vitestData = {
        numTotalTests: 87,
        numPassedTests: 87,
        numFailedTests: 0,
        numPendingTests: 0,
        numTodoTests: 0,
        success: true,
      };
      fs.writeFileSync(path.join(tempDir, "test-results/vitest-results.json"), JSON.stringify(vitestData, null, 2));

      const coverageData = {
        total: {
          lines: { pct: 82.9 },
          statements: { pct: 82.9 },
          functions: { pct: 89.36 },
          branches: { pct: 71.72 },
        },
      };
      fs.writeFileSync(path.join(tempDir, "coverage/coverage-summary.json"), JSON.stringify(coverageData, null, 2));

      const pwSpecs = [];
      for (let i = 0; i < 26; i++) {
        pwSpecs.push({ ok: true, tests: [{ status: "expected" }] });
      }
      const playwrightData = {
        stats: {
          expected: 26,
          unexpected: 0,
          skipped: 0,
        },
        suites: [{ specs: pwSpecs }],
      };
      fs.writeFileSync(path.join(tempDir, "test-results/playwright-results.json"), JSON.stringify(playwrightData, null, 2));

      const axeData = {
        initial_state: { violationsCount: 0, violations: [] },
        complete_state: { violationsCount: 0, violations: [] },
        ablation_modal: { violationsCount: 0, violations: [] },
        receipt_modal: { violationsCount: 0, violations: [] },
        evidence_drawer: { violationsCount: 0, violations: [] },
      };
      fs.writeFileSync(path.join(tempDir, "test-results/axe-results.json"), JSON.stringify(axeData, null, 2));

      const secData = {
        status: "PASSED",
        exitCode: 0,
        totalViolations: 0,
        scope: "Working tree files AND complete reachable Git commit history",
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(tempDir, "test-results/security-scan.json"), JSON.stringify(secData, null, 2));

      const auditData = {
        status: "NOT_CLEAN",
        gateStatus: "WARN",
        totalVulnerabilities: 5,
        highVulnerabilities: 3,
        moderateVulnerabilities: 2,
        criticalVulnerabilities: 0,
        packageChains: [],
        timestamp: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(tempDir, "test-results/npm-audit.json"), JSON.stringify(auditData, null, 2));

      return tempDir;
    }

    it("1. a fresh lint artifact with a new valid hash does not fail metadata-only committed-evidence validation", () => {
      const tempDir = setupIsolatedCiWorkspace();
      try {
        const testedSha = "a2d9798a3d48c1eb7392153177828d5d6538cf5f";
        const snapshotFile = path.join(tempDir, "docs/verification-results.json");
        fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
        const committedSnapshot = generateResults({
          cwd: tempDir,
          outputFile: snapshotFile,
          testedImplementationCommit: testedSha,
        });

        // Simulate fresh CI run modifying lint artifact with new timestamp/files
        const freshLint = {
          status: "PASSED",
          exitCode: 0,
          errorCount: 0,
          warningCount: 0,
          filesChecked: 36,
          timestamp: new Date(Date.now() + 5000).toISOString(),
        };
        fs.writeFileSync(path.join(tempDir, "test-results/lint-results.json"), JSON.stringify(freshLint, null, 2));

        // Metadata-only validation must pass!
        const result = verifyMetadataOnly(committedSnapshot, {
          cwd: tempDir,
          carrierHead: testedSha,
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("2. that same changed artifact does fail full verification against the old local snapshot", () => {
      const tempDir = setupIsolatedCiWorkspace();
      try {
        const testedSha = "a2d9798a3d48c1eb7392153177828d5d6538cf5f";
        const snapshotFile = path.join(tempDir, "docs/verification-results.json");
        fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
        const committedSnapshot = generateResults({
          cwd: tempDir,
          outputFile: snapshotFile,
          testedImplementationCommit: testedSha,
        });

        // Modify lint artifact
        const freshLint = {
          status: "PASSED",
          exitCode: 0,
          errorCount: 0,
          warningCount: 0,
          filesChecked: 36,
          timestamp: new Date(Date.now() + 5000).toISOString(),
        };
        fs.writeFileSync(path.join(tempDir, "test-results/lint-results.json"), JSON.stringify(freshLint, null, 2));

        // Full verification against old committed snapshot must fail due to hash mismatch
        const reparsed = parseCurrentArtifacts(tempDir);
        const result = verifyEvidence(committedSnapshot, reparsed, {
          cwd: tempDir,
          carrierHead: testedSha,
          installedHarnessVersion: "0.1.26",
        });

        expect(result.valid).toBe(false);
        expect(result.errors.some((e: string) => e.includes("Raw artifact hash mismatch for test-results/lint-results.json"))).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("3. CI evidence generated after the changed artifact passes full verification", () => {
      const tempDir = setupIsolatedCiWorkspace();
      try {
        const testedSha = "a2d9798a3d48c1eb7392153177828d5d6538cf5f";

        // Modify lint artifact
        const freshLint = {
          status: "PASSED",
          exitCode: 0,
          errorCount: 0,
          warningCount: 0,
          filesChecked: 36,
          timestamp: new Date().toISOString(),
        };
        fs.writeFileSync(path.join(tempDir, "test-results/lint-results.json"), JSON.stringify(freshLint, null, 2));

        // Generate independent CI evidence
        const ciOutputFile = path.join(tempDir, "test-results/ci-verification-results.json");
        const ciEvidence = generateResults({
          cwd: tempDir,
          outputFile: ciOutputFile,
          testedImplementationCommit: testedSha,
        });

        // Full verification against matching current CI artifacts must pass!
        const reparsed = parseCurrentArtifacts(tempDir);
        const result = verifyEvidence(ciEvidence, reparsed, {
          cwd: tempDir,
          carrierHead: testedSha,
          installedHarnessVersion: "0.1.26",
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("4. tampering with any raw artifact after CI evidence generation fails", () => {
      const tempDir = setupIsolatedCiWorkspace();
      try {
        const testedSha = "a2d9798a3d48c1eb7392153177828d5d6538cf5f";
        const ciOutputFile = path.join(tempDir, "test-results/ci-verification-results.json");
        const ciEvidence = generateResults({
          cwd: tempDir,
          outputFile: ciOutputFile,
          testedImplementationCommit: testedSha,
        });

        // Tamper with security scan artifact after generation
        const tamperedSec = {
          status: "PASSED",
          exitCode: 0,
          totalViolations: 0,
          scope: "TAMPERED_SCOPE",
          completedAt: new Date().toISOString(),
        };
        fs.writeFileSync(path.join(tempDir, "test-results/security-scan.json"), JSON.stringify(tamperedSec, null, 2));

        const reparsed = parseCurrentArtifacts(tempDir);
        const result = verifyEvidence(ciEvidence, reparsed, {
          cwd: tempDir,
          carrierHead: testedSha,
          installedHarnessVersion: "0.1.26",
        });

        expect(result.valid).toBe(false);
        expect(result.errors.some((e: string) => e.includes("Raw artifact hash mismatch for test-results/security-scan.json"))).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("5. metadata-only mode still rejects invalid SHA formats, false PASSED audits, invalid ancestry, missing gates, and false LIVE_QLOO_VERIFIED claims", () => {
      const validData = createValidCommittedData();

      // 5a. Invalid SHA format
      const invalidShaResult = verifyMetadataOnly({
        ...validData,
        testedImplementationCommit: "invalid-sha-12345",
      });
      expect(invalidShaResult.valid).toBe(false);
      expect(invalidShaResult.errors.some((e: string) => e.includes("Invalid testedImplementationCommit format"))).toBe(true);

      // 5b. False PASSED audit
      const falseAuditResult = verifyMetadataOnly({
        ...validData,
        qualityGates: {
          ...validData.qualityGates,
          gate8_dependency_audit: {
            command: "npm audit --omit=dev --audit-level=high",
            status: "PASSED",
            totalVulnerabilities: 5,
            highVulnerabilities: 3,
            moderateVulnerabilities: 2,
          },
        },
      });
      expect(falseAuditResult.valid).toBe(false);
      expect(falseAuditResult.errors.some((e: string) => e.includes("falsely claims PASSED"))).toBe(true);

      // 5c. Invalid ancestry (zero SHA unrelated to carrierHead)
      const invalidAncestryResult = verifyMetadataOnly(
        {
          ...validData,
          testedImplementationCommit: "0000000000000000000000000000000000000000",
        },
        { carrierHead: validData.testedImplementationCommit }
      );
      expect(invalidAncestryResult.valid).toBe(false);
      expect(invalidAncestryResult.errors.some((e: string) => e.includes("unrelated") || e.includes("overly old"))).toBe(true);

      // 5d. Missing gates
      const missingGateData = JSON.parse(JSON.stringify(validData));
      delete missingGateData.qualityGates.gate4_monorepo_build;
      const missingGateResult = verifyMetadataOnly(missingGateData);
      expect(missingGateResult.valid).toBe(false);
      expect(missingGateResult.errors.some((e: string) => e.includes("Missing required quality gate: gate4_monorepo_build"))).toBe(true);

      // 5e. False LIVE_QLOO_VERIFIED claim
      const falseLiveClaimResult = verifyMetadataOnly({
        ...validData,
        verificationBoundaries: {
          ...validData.verificationBoundaries,
          liveIntegrationStatus: "LIVE_QLOO_VERIFIED",
        },
      });
      expect(falseLiveClaimResult.valid).toBe(false);
      expect(falseLiveClaimResult.errors.some((e: string) => e.includes("LIVE_QLOO_VERIFIED"))).toBe(true);
    });
  });
});
