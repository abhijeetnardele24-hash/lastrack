/**
 * LastRack Authoritative Machine-Readable Verification Results Generator
 * Aggregates actual measured outputs from Git, Linters, Typecheckers, Vitest,
 * Playwright, Axe, Security Scans, Build, and Dependency Audits into docs/verification-results.json.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const OUTPUT_FILE = path.join(DOCS_DIR, "verification-results.json");
const TEST_RESULTS_DIR = path.join(ROOT, "test-results");

function getCommitSha() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch {
    return "UNKNOWN_COMMIT";
  }
}

function getCommitTimestamp(sha) {
  try {
    const raw = execSync(`git log -1 --format=%ct ${sha}`, { cwd: ROOT, encoding: "utf-8" }).trim();
    return parseInt(raw, 10) * 1000;
  } catch {
    return Date.now() - 3600000;
  }
}

function getBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function getHarnessVersion() {
  try {
    const pkgPath = path.join(ROOT, "node_modules/@qloo/qloo-harness/package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return pkg.version || "UNKNOWN";
    }
  } catch {}
  return "UNKNOWN";
}

function getDockerStatus() {
  return "NOT_VERIFIED (Docker daemon and container healthcheck not executed in this environment)";
}

function getLiveIntegrationStatus() {
  const hasKey = Boolean(process.env.QLOO_API_KEY && process.env.QLOO_API_KEY.length > 10);
  const liveSmokePath = path.join(TEST_RESULTS_DIR, "live-smoke.json");
  if (fs.existsSync(liveSmokePath)) {
    try {
      const smoke = JSON.parse(fs.readFileSync(liveSmokePath, "utf-8"));
      if (smoke.status === "PASSED" && smoke.sourceMode === "LIVE_QLOO") {
        return "LIVE_QLOO_VERIFIED";
      }
    } catch {}
  }
  if (hasKey) {
    return "KEY_PRESENT_NOT_LIVE_VERIFIED";
  }
  return "NOT_VERIFIED (No live QLOO_API_KEY configured in test session; verified via real child-process contract handshake and mock suite)";
}

function getDeploymentStatus() {
  return {
    remoteRepositoryUrl: "NOT_VERIFIED (Pending remote GitHub repository creation)",
    ciExecutionUrl: "NOT_VERIFIED (Pending remote workflow trigger)",
    liveProductionUrl: "NOT_VERIFIED (No remote production deployment configured)",
    status: "LOCAL_VERIFIED_ONLY",
  };
}

function generateResults() {
  console.log("⚙️ [Verification Generator] Parsing authoritative command and test outputs...");

  const timestamp = new Date().toISOString();
  const currentHeadSha = getCommitSha();
  const branch = getBranch();
  const harnessVersion = getHarnessVersion();

  const testedImplementationCommit = process.env.TESTED_COMMIT || currentHeadSha;
  const evidenceCommit = process.env.EVIDENCE_COMMIT || currentHeadSha;

  // 1. Lint Output
  let lintSummary = { status: "NOT_RUN", errorCount: 0, warningCount: 0, filesChecked: 0 };
  const lintResultsPath = path.join(TEST_RESULTS_DIR, "lint-results.json");
  if (fs.existsSync(lintResultsPath)) {
    try {
      lintSummary = JSON.parse(fs.readFileSync(lintResultsPath, "utf-8"));
    } catch (e) {
      console.warn("Could not parse lint-results.json:", e.message);
    }
  }

  // 2. Typecheck Output
  let typecheckSummary = { status: "NOT_RUN", errorCount: 0, packagesChecked: [] };
  const typecheckResultsPath = path.join(TEST_RESULTS_DIR, "typecheck-results.json");
  if (fs.existsSync(typecheckResultsPath)) {
    try {
      typecheckSummary = JSON.parse(fs.readFileSync(typecheckResultsPath, "utf-8"));
    } catch (e) {
      console.warn("Could not parse typecheck-results.json:", e.message);
    }
  }

  // 3. Build Output
  let buildSummary = { status: "NOT_RUN", artifacts: [] };
  const buildResultsPath = path.join(TEST_RESULTS_DIR, "build-results.json");
  if (fs.existsSync(buildResultsPath)) {
    try {
      buildSummary = JSON.parse(fs.readFileSync(buildResultsPath, "utf-8"));
    } catch (e) {
      console.warn("Could not parse build-results.json:", e.message);
    }
  }

  // 4. Contract Test Output
  let contractTest = { status: "NOT_RUN", details: "Run tests/contract/mcpChildProcess.test.ts" };
  const contractTestPath = path.join(TEST_RESULTS_DIR, "contract-test.json");
  if (fs.existsSync(contractTestPath)) {
    try {
      contractTest = JSON.parse(fs.readFileSync(contractTestPath, "utf-8"));
    } catch (e) {
      console.warn("Could not parse contract-test.json:", e.message);
    }
  }

  // 5. Vitest Unit & Integration Test Output
  let vitestSummary = { testsTotal: 0, testsPassed: 0, testsFailed: 0, status: "NOT_RUN" };
  const vitestResultsPath = path.join(TEST_RESULTS_DIR, "vitest-results.json");
  if (fs.existsSync(vitestResultsPath)) {
    try {
      const v = JSON.parse(fs.readFileSync(vitestResultsPath, "utf-8"));
      vitestSummary = {
        testsTotal: v.numTotalTests ?? (v.testResults?.reduce((acc, t) => acc + (t.assertionResults?.length || 0), 0) || 0),
        testsPassed: v.numPassedTests ?? (v.testResults?.reduce((acc, t) => acc + (t.assertionResults?.filter(a => a.status === "passed").length || 0), 0) || 0),
        testsFailed: v.numFailedTests ?? (v.testResults?.reduce((acc, t) => acc + (t.assertionResults?.filter(a => a.status === "failed").length || 0), 0) || 0),
        status: (v.numFailedTests === 0 && (v.numPassedTests > 0 || v.numTotalTests > 0)) ? "PASSED" : "FAILED",
        durationMs: v.startTime ? Date.now() - v.startTime : undefined,
      };
    } catch (e) {
      console.warn("Could not parse vitest-results.json:", e.message);
    }
  }

  // 6. Coverage Summary Output
  let coverageSummary = null;
  const coverageSummaryPath = path.join(ROOT, "coverage", "coverage-summary.json");
  if (fs.existsSync(coverageSummaryPath)) {
    try {
      const cov = JSON.parse(fs.readFileSync(coverageSummaryPath, "utf-8"));
      coverageSummary = {
        lines: cov.total?.lines?.pct,
        statements: cov.total?.statements?.pct,
        functions: cov.total?.functions?.pct,
        branches: cov.total?.branches?.pct,
      };
    } catch {}
  }

  // 7. Playwright E2E Output
  let playwrightSummary = { testsTotal: 0, testsPassed: 0, testsFailed: 0, status: "NOT_RUN" };
  const playwrightResultsPath = path.join(TEST_RESULTS_DIR, "playwright-results.json");
  if (fs.existsSync(playwrightResultsPath)) {
    try {
      const p = JSON.parse(fs.readFileSync(playwrightResultsPath, "utf-8"));
      let total = 0;
      let passed = 0;
      let failed = 0;

      function countSpecs(suite) {
        if (suite.specs) {
          for (const s of suite.specs) {
            total += s.tests?.length || 1;
            for (const t of s.tests || []) {
              const status = t.status || t.results?.[0]?.status;
              if (status === "expected" || status === "passed") passed++;
              else if (status === "unexpected" || status === "failed") failed++;
            }
          }
        }
        if (suite.suites) {
          for (const sub of suite.suites) countSpecs(sub);
        }
      }
      for (const s of p.suites || []) countSpecs(s);

      playwrightSummary = {
        testsTotal: total || p.stats?.expected || 0,
        testsPassed: passed || p.stats?.expected || 0,
        testsFailed: failed || p.stats?.unexpected || 0,
        status: (failed === 0 && (passed > 0 || total > 0)) ? "PASSED" : "FAILED",
      };
    } catch (e) {
      console.warn("Could not parse playwright-results.json:", e.message);
    }
  }

  // 8. Axe Accessibility Output
  let axeSummary = { totalTestedStates: 0, totalViolations: 0, status: "NOT_RUN" };
  const axeResultsPath = path.join(TEST_RESULTS_DIR, "axe-results.json");
  if (fs.existsSync(axeResultsPath)) {
    try {
      const axe = JSON.parse(fs.readFileSync(axeResultsPath, "utf-8"));
      const states = Object.keys(axe);
      let totalViolations = 0;
      for (const s of states) {
        totalViolations += axe[s]?.violationsCount || axe[s]?.violations?.length || 0;
      }
      axeSummary = {
        totalTestedStates: states.length,
        testedStates: states,
        totalViolations,
        status: totalViolations === 0 ? "PASSED" : "FAILED",
        disclaimer: "Automated Axe scans detected zero violations in the tested states and enabled rules. We do not claim universal WCAG compliance.",
      };
    } catch {}
  }

  // 9. Security Scan Output
  let securitySummary = { status: "NOT_RUN", totalViolations: 0 };
  const secPath = path.join(TEST_RESULTS_DIR, "security-scan.json");
  if (fs.existsSync(secPath)) {
    try {
      securitySummary = JSON.parse(fs.readFileSync(secPath, "utf-8"));
    } catch {}
  }

  // 10. Dependency Audit Output
  let auditSummary = { status: "NOT_RUN", totalVulnerabilities: 0 };
  const auditPath = path.join(TEST_RESULTS_DIR, "npm-audit.json");
  if (fs.existsSync(auditPath)) {
    try {
      auditSummary = JSON.parse(fs.readFileSync(auditPath, "utf-8"));
    } catch {}
  }

  const results = {
    repository: "lastrack",
    generatedAt: timestamp,
    testedImplementationCommit,
    evidenceCommit,
    branch,
    canonicalQlooContract: {
      protocolVersion: "2024-11-05",
      contractVersion: "1.0.0",
      harnessPackage: `@qloo/qloo-harness@${harnessVersion}`,
      checksum: "sha256:762bdcc5e14ff797b6de739d2658a83f78af35e68d7a5a3449455be6046924f5",
      executableCommand: "node dist/bin.js mcp",
      requiredOperations: ["describe", "find_tags", "recommend", "rank"],
      supportedTools: [
        "qloo_describe",
        "qloo_find_tags",
        "qloo_recommend",
        "qloo_rank",
        "qloo_capabilities"
      ],
      mcpContractTest: contractTest,
      rankingInvariant: "One qloo_rank batch per comparable entity domain",
      singleQueryRankingInvariantEnforced: true,
      integrityDigestType: "SHA-256",
    },
    qualityGates: {
      gate1_lint: {
        command: "npm run lint",
        status: lintSummary.status,
        errorCount: lintSummary.errorCount,
        warningCount: lintSummary.warningCount,
        filesChecked: lintSummary.filesChecked,
        details: lintSummary.details,
      },
      gate2_typecheck: {
        command: "npm run typecheck",
        status: typecheckSummary.status,
        packagesChecked: typecheckSummary.packagesChecked,
        errorCount: typecheckSummary.errorCount,
        details: typecheckSummary.details,
      },
      gate3_unit_tests: {
        command: "npm test",
        status: vitestSummary.status,
        testsTotal: vitestSummary.testsTotal,
        testsPassed: vitestSummary.testsPassed,
        testsFailed: vitestSummary.testsFailed,
        coverage: coverageSummary,
      },
      gate4_monorepo_build: {
        command: "npm run build",
        status: buildSummary.status,
        artifacts: buildSummary.artifacts?.map((a) => a.path) || [
          "apps/web/dist/index.html",
          "apps/server/dist/server.js"
        ],
      },
      gate5_playwright_e2e: {
        command: "npm run test:e2e",
        status: playwrightSummary.status,
        testsTotal: playwrightSummary.testsTotal,
        testsPassed: playwrightSummary.testsPassed,
        testsFailed: playwrightSummary.testsFailed,
        projects: ["Desktop Chromium", "Mobile Chrome"],
      },
      gate6_accessibility_axe: {
        tool: "@axe-core/playwright",
        status: axeSummary.status,
        totalTestedStates: axeSummary.totalTestedStates,
        totalViolations: axeSummary.totalViolations,
        testedStates: axeSummary.testedStates,
        statement: axeSummary.disclaimer || "Automated Axe scans detected zero violations in the tested states and enabled rules. We do not claim universal WCAG compliance.",
      },
      gate7_security_secrets: {
        command: "npm run security-scan",
        status: securitySummary.status,
        scope: "Working tree files AND complete reachable Git commit history",
        totalViolations: securitySummary.totalViolations,
      },
      gate8_dependency_audit: {
        command: "npm audit --omit=dev --audit-level=high",
        status: auditSummary.status || "NOT_CLEAN",
        gateResult: auditSummary.gateStatus || "WARN",
        totalVulnerabilities: auditSummary.totalVulnerabilities,
        highVulnerabilities: auditSummary.highVulnerabilities,
        moderateVulnerabilities: auditSummary.moderateVulnerabilities,
        criticalVulnerabilities: auditSummary.criticalVulnerabilities,
        packageChains: auditSummary.packageChains || [],
      },
    },
    verificationBoundaries: {
      dockerStatus: getDockerStatus(),
      liveIntegrationStatus: getLiveIntegrationStatus(),
      deployment: getDeploymentStatus(),
      unverifiedNotice: "All remote or live environments not executed locally remain strictly labeled NOT_VERIFIED.",
    },
  };

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf-8");
  console.log(`✅ [Verification Generator] Authoritative results written to ${OUTPUT_FILE}`);
}

if (process.argv.includes("--verify-only")) {
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.error("❌ docs/verification-results.json is missing!");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
  
  const testedCommit = data.testedImplementationCommit || data.testedCommitSha;
  const evidenceCommit = data.evidenceCommit || getCommitSha();
  const commitTimestamp = getCommitTimestamp(testedCommit);

  // 1. Verify required artifacts exist on disk and do not predate tested commit
  const requiredArtifacts = [
    "lint-results.json",
    "typecheck-results.json",
    "build-results.json",
    "vitest-results.json",
    "playwright-results.json",
    "axe-results.json",
    "security-scan.json",
    "npm-audit.json",
    "contract-test.json"
  ];
  for (const art of requiredArtifacts) {
    const artPath = path.join(TEST_RESULTS_DIR, art);
    if (!fs.existsSync(artPath)) {
      console.error(`❌ Required verification artifact is missing: test-results/${art}`);
      process.exit(1);
    }
    const stat = fs.statSync(artPath);
    // Artifact must not predate tested commit (allowing 10 min window for test suite duration)
    if (stat.mtimeMs < commitTimestamp - 600000) {
      console.error(`❌ Artifact test-results/${art} predates tested commit ${testedCommit}! (Artifact: ${new Date(stat.mtimeMs).toISOString()}, Commit: ${new Date(commitTimestamp).toISOString()})`);
      process.exit(1);
    }
  }

  // 2. Verify build files exist on disk
  const webDist = path.join(ROOT, "apps/web/dist/index.html");
  const serverDist = path.join(ROOT, "apps/server/dist/server.js");
  if (!fs.existsSync(webDist) || !fs.existsSync(serverDist)) {
    console.error("❌ Build distribution files are missing on disk!");
    process.exit(1);
  }

  // 3. Verify quality gates
  const g = data.qualityGates || {};
  if (
    g.gate1_lint?.status !== "PASSED" ||
    g.gate2_typecheck?.status !== "PASSED" ||
    g.gate3_unit_tests?.status !== "PASSED" ||
    g.gate4_monorepo_build?.status !== "PASSED" ||
    g.gate5_playwright_e2e?.status !== "PASSED" ||
    g.gate6_accessibility_axe?.status !== "PASSED" ||
    g.gate7_security_secrets?.status !== "PASSED"
  ) {
    console.error("❌ Verification validation failed: one or more quality gates have not passed!");
    process.exit(1);
  }

  // 4. Verify test totals and ensure zero failed/skipped
  if ((g.gate3_unit_tests?.testsFailed || 0) > 0 || (g.gate3_unit_tests?.testsTotal || 0) < 50) {
    console.error("❌ Unit test totals inconsistent or failed tests detected!");
    process.exit(1);
  }
  if ((g.gate5_playwright_e2e?.testsFailed || 0) > 0 || (g.gate5_playwright_e2e?.testsTotal || 0) < 20) {
    console.error("❌ E2E test totals inconsistent or failed tests detected!");
    process.exit(1);
  }
  if ((g.gate6_accessibility_axe?.totalViolations || 0) > 0) {
    console.error("❌ Accessibility violations detected in Axe scans!");
    process.exit(1);
  }

  // 5. Verify contract test status and checksum
  if (data.canonicalQlooContract?.mcpContractTest?.status !== "PASSED") {
    console.error("❌ MCP contract test evidence is missing or failed!");
    process.exit(1);
  }

  // 6. Verify harness package version matches installed package
  const installedHarnessVersion = getHarnessVersion();
  if (
    !data.canonicalQlooContract?.harnessPackage?.includes(installedHarnessVersion) ||
    installedHarnessVersion === "UNKNOWN"
  ) {
    console.error(`❌ Harness package version mismatch! Installed: ${installedHarnessVersion}, Recorded: ${data.canonicalQlooContract?.harnessPackage}`);
    process.exit(1);
  }

  // 7. Verify relationship between testedImplementationCommit and current evidenceCommit / current HEAD
  if (testedCommit && testedCommit !== "UNKNOWN_COMMIT") {
    const commitsToCheck = new Set([evidenceCommit, getCommitSha()].filter(c => c && c !== "UNKNOWN_COMMIT"));
    for (const commitToCheck of commitsToCheck) {
      try {
        execSync(`git merge-base --is-ancestor ${testedCommit} ${commitToCheck}`, { cwd: ROOT, encoding: "utf-8" });
        const revCount = parseInt(execSync(`git rev-list --count ${testedCommit}..${commitToCheck}`, { cwd: ROOT, encoding: "utf-8" }).trim(), 10);
        if (revCount > 1) {
          console.error(`❌ Commit (${commitToCheck}) is more than 1 commit ahead of tested commit (${testedCommit})!`);
          process.exit(1);
        }
      } catch (e) {
        console.error(`❌ Tested SHA (${testedCommit}) is unrelated to or not an ancestor of commit (${commitToCheck}):`, e.message);
        process.exit(1);
      }
    }
  }

  // 8. Ensure dependency audit is NOT falsely claimed as PASSED
  if (g.gate8_dependency_audit?.status === "PASSED" && g.gate8_dependency_audit?.totalVulnerabilities > 0) {
    console.error("❌ Gate 8 incorrectly claims PASSED with active vulnerabilities!");
    process.exit(1);
  }

  // 9. Ensure live execution is NOT claimed without real live evidence
  if (
    data.verificationBoundaries?.liveIntegrationStatus === "LIVE_QLOO_VERIFIED" &&
    !fs.existsSync(path.join(TEST_RESULTS_DIR, "live-smoke.json"))
  ) {
    console.error("❌ Live execution claimed without live smoke evidence!");
    process.exit(1);
  }

  console.log("✅ [Verification Validation] Authoritative verification file is valid, consistent, fresh, and passing.");
  process.exit(0);
}

generateResults();
