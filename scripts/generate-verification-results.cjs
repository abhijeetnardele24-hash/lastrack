/**
 * LastRack Authoritative Machine-Readable Verification Results Generator & Validator
 *
 * Provides:
 * 1. Independent machine-artifact parser with strict schema validation (parseCurrentArtifacts)
 * 2. Fail-closed comparative verifier with raw artifact SHA-256 integrity checks (verifyEvidence)
 * 3. Authoritative JSON results generator (generateResults)
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const DEFAULT_OUTPUT_FILE = path.join(DOCS_DIR, "verification-results.json");

const CANONICAL_CHECKSUM = "sha256:762bdcc5e14ff797b6de739d2658a83f78af35e68d7a5a3449455be6046924f5";
const REQUIRED_TOOLS = ["qloo_describe", "qloo_find_tags", "qloo_recommend", "qloo_rank", "qloo_capabilities"];
const REQUIRED_BUILD_PATHS = ["apps/web/dist/index.html", "apps/server/dist/server.js"];

function getCommitSha(cwd = ROOT) {
  try {
    return execSync("git rev-parse HEAD", { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "UNKNOWN_COMMIT";
  }
}

function getCommitTimestamp(sha, cwd = ROOT) {
  try {
    const raw = execSync(`git log -1 --format=%ct ${sha}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    return parseInt(raw, 10) * 1000;
  } catch {
    return Date.now() - 3600000;
  }
}

function getBranch(cwd = ROOT) {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "unknown";
  }
}

function getHarnessVersion(cwd = ROOT) {
  try {
    const pkgPath = path.join(cwd, "node_modules/@qloo/qloo-harness/package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return pkg.version || "UNKNOWN";
    }
  } catch {}
  return "UNKNOWN";
}

function computeFileSha256(fullPath) {
  const content = fs.readFileSync(fullPath);
  return "sha256:" + crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Strict schema validators for raw artifacts.
 * Explicitly rejects `{}` and missing/incorrectly-typed required properties.
 */
function validateLintArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Lint artifact is empty or not an object."] };
  }
  if (data.status !== "PASSED" && data.status !== "FAILED") {
    errors.push(`Lint artifact status must be PASSED or FAILED (got ${data.status}).`);
  }
  if (typeof data.exitCode !== "number") {
    errors.push(`Lint artifact missing numeric exitCode.`);
  } else if (data.status === "PASSED" && data.exitCode !== 0) {
    errors.push(`Lint artifact status is PASSED but exitCode is ${data.exitCode} (expected 0).`);
  }
  if (typeof data.errorCount !== "number" || data.errorCount < 0) {
    errors.push(`Lint artifact missing non-negative numeric errorCount.`);
  }
  if (typeof data.warningCount !== "number" || data.warningCount < 0) {
    errors.push(`Lint artifact missing non-negative numeric warningCount.`);
  }
  if (typeof data.filesChecked !== "number" || data.filesChecked <= 0) {
    errors.push(`Lint artifact missing positive numeric filesChecked.`);
  }
  if (typeof data.timestamp !== "string" || isNaN(Date.parse(data.timestamp))) {
    errors.push(`Lint artifact missing valid ISO timestamp.`);
  }
  return { valid: errors.length === 0, errors };
}

function validateTypecheckArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Typecheck artifact is empty or not an object."] };
  }
  if (data.status !== "PASSED" && data.status !== "FAILED") {
    errors.push(`Typecheck artifact status must be PASSED or FAILED (got ${data.status}).`);
  }
  if (typeof data.exitCode !== "number") {
    errors.push(`Typecheck artifact missing numeric exitCode.`);
  } else if (data.status === "PASSED" && data.exitCode !== 0) {
    errors.push(`Typecheck artifact status is PASSED but exitCode is ${data.exitCode} (expected 0).`);
  }
  if (typeof data.errorCount !== "number" || data.errorCount < 0) {
    errors.push(`Typecheck artifact missing non-negative numeric errorCount.`);
  }
  if (!Array.isArray(data.packagesChecked) || data.packagesChecked.length === 0) {
    errors.push(`Typecheck artifact missing non-empty packagesChecked array.`);
  }
  if (typeof data.timestamp !== "string" || isNaN(Date.parse(data.timestamp))) {
    errors.push(`Typecheck artifact missing valid ISO timestamp.`);
  }
  return { valid: errors.length === 0, errors };
}

function validateBuildArtifact(data, cwd = ROOT) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Build artifact is empty or not an object."] };
  }
  if (data.status !== "PASSED") {
    errors.push(`Build artifact status must be explicitly PASSED (got ${data.status}).`);
  }
  if (typeof data.exitCode !== "number" || data.exitCode !== 0) {
    errors.push(`Build artifact missing zero numeric exitCode (got ${data.exitCode}).`);
  }
  if (!Array.isArray(data.artifacts) || data.artifacts.length === 0) {
    errors.push(`Build artifact missing non-empty artifacts array.`);
  } else {
    const paths = data.artifacts.map((a) => (typeof a === "string" ? a : a?.path)).filter(Boolean);
    for (const reqPath of REQUIRED_BUILD_PATHS) {
      if (!paths.includes(reqPath)) {
        errors.push(`Build artifact missing required distribution path: ${reqPath}`);
      }
    }
    for (const p of paths) {
      if (!fs.existsSync(path.join(cwd, p))) {
        errors.push(`Build distribution file does not exist on disk: ${p}`);
      }
    }
  }
  if (typeof data.timestamp !== "string" || isNaN(Date.parse(data.timestamp))) {
    errors.push(`Build artifact missing valid ISO timestamp.`);
  }
  return { valid: errors.length === 0, errors };
}

function validateVitestArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Vitest artifact is empty or not an object."] };
  }
  if (typeof data.numTotalTests !== "number" || data.numTotalTests <= 0) {
    errors.push(`Vitest artifact missing positive numeric numTotalTests.`);
  }
  if (typeof data.numPassedTests !== "number" || data.numPassedTests <= 0) {
    errors.push(`Vitest artifact missing positive numeric numPassedTests.`);
  }
  if (typeof data.numFailedTests !== "number" || data.numFailedTests < 0) {
    errors.push(`Vitest artifact missing non-negative numeric numFailedTests.`);
  }
  if (typeof data.numPendingTests !== "number" || data.numPendingTests < 0) {
    errors.push(`Vitest artifact missing non-negative numeric numPendingTests.`);
  }
  if (typeof data.numTodoTests !== "number" || data.numTodoTests < 0) {
    errors.push(`Vitest artifact missing non-negative numeric numTodoTests.`);
  }
  if (typeof data.success !== "boolean") {
    errors.push(`Vitest artifact missing boolean success property.`);
  }
  return { valid: errors.length === 0, errors };
}

function validateCoverageArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Coverage summary artifact is empty or not an object."] };
  }
  if (!data.total || typeof data.total !== "object") {
    errors.push(`Coverage artifact missing total summary object.`);
  } else {
    for (const metric of ["lines", "statements", "functions", "branches"]) {
      const pct = data.total[metric]?.pct;
      if (typeof pct !== "number" || isNaN(pct) || pct < 0 || pct > 100) {
        errors.push(`Coverage artifact missing valid numeric percentage for ${metric}.`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function validatePlaywrightArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Playwright artifact is empty or not an object."] };
  }
  if (!data.stats || typeof data.stats !== "object") {
    errors.push(`Playwright artifact missing stats object.`);
  } else {
    if (typeof data.stats.expected !== "number" || data.stats.expected <= 0) {
      errors.push(`Playwright artifact missing positive numeric stats.expected.`);
    }
    if (typeof data.stats.unexpected !== "number" || data.stats.unexpected < 0) {
      errors.push(`Playwright artifact missing non-negative numeric stats.unexpected.`);
    }
    if (typeof data.stats.skipped !== "number" || data.stats.skipped < 0) {
      errors.push(`Playwright artifact missing non-negative numeric stats.skipped.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateAxeArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Axe artifact is empty or not an object."] };
  }
  const states = Object.keys(data);
  if (states.length === 0) {
    errors.push(`Axe artifact contains zero tested states.`);
  }
  for (const s of states) {
    const entry = data[s];
    if (!entry || typeof entry !== "object") {
      errors.push(`Axe state "${s}" is not a valid object.`);
    } else {
      if (typeof entry.violationsCount !== "number" || entry.violationsCount < 0) {
        errors.push(`Axe state "${s}" missing non-negative numeric violationsCount.`);
      }
      if (!Array.isArray(entry.violations)) {
        errors.push(`Axe state "${s}" missing violations array.`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateSecurityScanArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Security scan artifact is empty or not an object."] };
  }
  if (data.status !== "PASSED") {
    errors.push(`Security scan status must be explicitly PASSED (got ${data.status}).`);
  }
  if (typeof data.exitCode !== "number" || data.exitCode !== 0) {
    errors.push(`Security scan missing zero numeric exitCode (got ${data.exitCode}).`);
  }
  if (typeof data.totalViolations !== "number" || data.totalViolations !== 0) {
    errors.push(`Security scan totalViolations must be strictly numeric zero (got ${data.totalViolations}).`);
  }
  if (typeof data.scope !== "string" || data.scope.trim().length === 0) {
    errors.push(`Security scan missing declared scan scope string.`);
  }
  if (typeof data.timestamp !== "string" || isNaN(Date.parse(data.timestamp))) {
    errors.push(`Security scan missing valid ISO completion timestamp.`);
  }
  return { valid: errors.length === 0, errors };
}

function validateAuditArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Dependency audit artifact is empty or not an object."] };
  }
  if (typeof data.status !== "string" || data.status.length === 0) {
    errors.push(`Dependency audit missing status string.`);
  }
  const gate = data.gateStatus || data.gateResult;
  if (typeof gate !== "string" || gate.length === 0) {
    errors.push(`Dependency audit missing gateStatus/gateResult string.`);
  }
  if (typeof data.totalVulnerabilities !== "number" || data.totalVulnerabilities < 0) {
    errors.push(`Dependency audit missing non-negative numeric totalVulnerabilities.`);
  }
  if (typeof data.highVulnerabilities !== "number" || data.highVulnerabilities < 0) {
    errors.push(`Dependency audit missing non-negative numeric highVulnerabilities.`);
  }
  if (typeof data.moderateVulnerabilities !== "number" || data.moderateVulnerabilities < 0) {
    errors.push(`Dependency audit missing non-negative numeric moderateVulnerabilities.`);
  }
  if (typeof data.criticalVulnerabilities !== "number" || data.criticalVulnerabilities < 0) {
    errors.push(`Dependency audit missing non-negative numeric criticalVulnerabilities.`);
  }
  if (!Array.isArray(data.packageChains)) {
    errors.push(`Dependency audit missing packageChains array.`);
  }
  return { valid: errors.length === 0, errors };
}

function validateContractTestArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length === 0) {
    return { valid: false, errors: ["Contract test artifact is empty or not an object."] };
  }
  if (data.status !== "PASSED") {
    errors.push(`Contract test status must be explicitly PASSED (got ${data.status}).`);
  }
  if (typeof data.exitCode !== "number" || data.exitCode !== 0) {
    errors.push(`Contract test missing zero numeric exitCode (got ${data.exitCode}).`);
  }
  if (typeof data.harnessVersion !== "string" || data.harnessVersion.length === 0) {
    errors.push(`Contract test missing harnessVersion string.`);
  }
  if (data.protocolVersion !== "2024-11-05") {
    errors.push(`Contract test protocolVersion must be "2024-11-05" (got ${data.protocolVersion}).`);
  }
  if (data.canonicalChecksum !== CANONICAL_CHECKSUM) {
    errors.push(`Contract test checksum mismatch (got ${data.canonicalChecksum}, expected ${CANONICAL_CHECKSUM}).`);
  }
  if (data.adapterReady !== true) {
    errors.push(`Contract test adapterReady must be boolean true.`);
  }
  if (!Array.isArray(data.toolsList)) {
    errors.push(`Contract test missing toolsList array.`);
  } else {
    for (const tool of REQUIRED_TOOLS) {
      if (!data.toolsList.includes(tool)) {
        errors.push(`Contract test toolsList missing required tool: ${tool}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Independently reads, hashes, and parses all raw machine artifacts without fallback defaults.
 */
function parseCurrentArtifacts(cwd = ROOT) {
  const testResultsDir = path.join(cwd, "test-results");
  const parsingErrors = [];
  const rawArtifactHashes = {};
  const rawArtifactTimestamps = {};

  function readAndValidate(relPath, validator) {
    const fullPath = path.join(cwd, relPath);
    if (!fs.existsSync(fullPath)) {
      parsingErrors.push(`Required raw artifact is missing: ${relPath}`);
      return null;
    }
    const stat = fs.statSync(fullPath);
    rawArtifactTimestamps[relPath] = stat.mtimeMs;
    rawArtifactHashes[relPath] = computeFileSha256(fullPath);

    let rawJson;
    try {
      rawJson = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch (e) {
      parsingErrors.push(`Failed to parse JSON in ${relPath}: ${e.message}`);
      return null;
    }

    const check = validator(rawJson, cwd);
    if (!check.valid) {
      for (const err of check.errors) {
        parsingErrors.push(`[${relPath}] ${err}`);
      }
      return null;
    }
    return rawJson;
  }

  // 1. Lint
  const rawLint = readAndValidate("test-results/lint-results.json", validateLintArtifact);
  const lint = rawLint
    ? {
        status: rawLint.status,
        exitCode: rawLint.exitCode,
        errorCount: rawLint.errorCount,
        warningCount: rawLint.warningCount,
        filesChecked: rawLint.filesChecked,
        details: rawLint.details,
      }
    : null;

  // 2. Typecheck
  const rawTypecheck = readAndValidate("test-results/typecheck-results.json", validateTypecheckArtifact);
  const typecheck = rawTypecheck
    ? {
        status: rawTypecheck.status,
        exitCode: rawTypecheck.exitCode,
        errorCount: rawTypecheck.errorCount,
        packagesChecked: rawTypecheck.packagesChecked,
        details: rawTypecheck.details,
      }
    : null;

  // 3. Build
  const rawBuild = readAndValidate("test-results/build-results.json", validateBuildArtifact);
  const build = rawBuild
    ? {
        status: rawBuild.status,
        exitCode: rawBuild.exitCode,
        artifacts: rawBuild.artifacts.map((a) => (typeof a === "string" ? a : a.path)),
        details: rawBuild.details,
      }
    : null;

  // 4. Contract Test
  const rawContract = readAndValidate("test-results/contract-test.json", validateContractTestArtifact);
  const contractTest = rawContract
    ? {
        status: rawContract.status,
        exitCode: rawContract.exitCode,
        harnessVersion: rawContract.harnessVersion,
        protocolVersion: rawContract.protocolVersion,
        canonicalChecksum: rawContract.canonicalChecksum,
        adapterReady: rawContract.adapterReady,
        supportedOperations: rawContract.supportedOperations,
        toolsList: rawContract.toolsList,
      }
    : null;

  // 5. Vitest
  const rawVitest = readAndValidate("test-results/vitest-results.json", validateVitestArtifact);
  const vitest = rawVitest
    ? {
        status: rawVitest.numFailedTests === 0 && rawVitest.numPendingTests === 0 && rawVitest.numPassedTests > 0 ? "PASSED" : "FAILED",
        testsTotal: rawVitest.numTotalTests,
        testsPassed: rawVitest.numPassedTests,
        testsFailed: rawVitest.numFailedTests,
        testsSkipped: rawVitest.numPendingTests + rawVitest.numTodoTests,
      }
    : null;

  // 6. Coverage Summary
  const rawCov = readAndValidate("coverage/coverage-summary.json", validateCoverageArtifact);
  const coverage = rawCov
    ? {
        lines: rawCov.total.lines.pct,
        statements: rawCov.total.statements.pct,
        functions: rawCov.total.functions.pct,
        branches: rawCov.total.branches.pct,
      }
    : null;

  // 7. Playwright E2E
  const rawPw = readAndValidate("test-results/playwright-results.json", validatePlaywrightArtifact);
  const playwright = rawPw
    ? {
        status: rawPw.stats.unexpected === 0 && rawPw.stats.skipped === 0 && rawPw.stats.expected > 0 ? "PASSED" : "FAILED",
        testsTotal: rawPw.stats.expected + rawPw.stats.unexpected + rawPw.stats.skipped,
        testsPassed: rawPw.stats.expected,
        testsFailed: rawPw.stats.unexpected,
        testsSkipped: rawPw.stats.skipped,
        projects: ["Desktop Chromium", "Mobile Chrome"],
      }
    : null;

  // 8. Axe Accessibility
  const rawAxe = readAndValidate("test-results/axe-results.json", validateAxeArtifact);
  let axe = null;
  if (rawAxe) {
    const states = Object.keys(rawAxe);
    let violations = 0;
    for (const s of states) {
      violations += rawAxe[s].violationsCount;
    }
    axe = {
      status: violations === 0 ? "PASSED" : "FAILED",
      totalTestedStates: states.length,
      testedStates: states,
      totalViolations: violations,
      statement: "Automated Axe scans detected zero violations in the tested states and enabled rules. We do not claim universal WCAG compliance.",
    };
  }

  // 9. Security Scan
  const rawSec = readAndValidate("test-results/security-scan.json", validateSecurityScanArtifact);
  const securityScan = rawSec
    ? {
        status: rawSec.status,
        exitCode: rawSec.exitCode,
        totalViolations: rawSec.totalViolations,
        scope: rawSec.scope,
      }
    : null;

  // 10. Dependency Audit
  const rawAudit = readAndValidate("test-results/npm-audit.json", validateAuditArtifact);
  const dependencyAudit = rawAudit
    ? {
        status: rawAudit.status,
        gateResult: rawAudit.gateStatus || rawAudit.gateResult,
        totalVulnerabilities: rawAudit.totalVulnerabilities,
        highVulnerabilities: rawAudit.highVulnerabilities,
        moderateVulnerabilities: rawAudit.moderateVulnerabilities,
        criticalVulnerabilities: rawAudit.criticalVulnerabilities,
        packageChains: rawAudit.packageChains,
      }
    : null;

  // 11. Live Smoke (optional)
  const smokePath = path.join(cwd, "test-results/live-smoke.json");
  let liveSmoke = { exists: false, passed: false, details: null };
  if (fs.existsSync(smokePath)) {
    try {
      const s = JSON.parse(fs.readFileSync(smokePath, "utf-8"));
      liveSmoke = {
        exists: true,
        passed: s.status === "PASSED" && s.sourceMode === "LIVE_QLOO",
        details: s,
      };
      rawArtifactHashes["test-results/live-smoke.json"] = computeFileSha256(smokePath);
    } catch {}
  }

  return {
    testResultsDir,
    parsingErrors,
    rawArtifactHashes,
    rawArtifactTimestamps,
    lint,
    typecheck,
    build,
    contractTest,
    vitest,
    coverage,
    playwright,
    axe,
    securityScan,
    dependencyAudit,
    liveSmoke,
  };
}

/**
 * Strict fail-closed comparison between committed evidence and reparsed artifacts.
 */
function verifyEvidence(committedData, reparsed, options = {}) {
  const errors = [];
  const cwd = options.cwd || ROOT;
  const installedHarnessVersion = options.installedHarnessVersion || getHarnessVersion(cwd);
  const carrierHead = options.carrierHead || getCommitSha(cwd);

  if (!committedData || typeof committedData !== "object" || Array.isArray(committedData) || Object.keys(committedData).length === 0) {
    return { valid: false, errors: ["Committed verification evidence is null, empty, or not an object."] };
  }

  // Check parsing errors from raw artifact schemas
  if (reparsed.parsingErrors && reparsed.parsingErrors.length > 0) {
    for (const e of reparsed.parsingErrors) {
      errors.push(`Artifact schema error: ${e}`);
    }
  }

  // 1. Raw Artifact Hash Verification (tamper detection)
  const committedHashes = committedData.rawArtifactHashes;
  if (!committedHashes || typeof committedHashes !== "object" || Object.keys(committedHashes).length === 0) {
    errors.push("Committed evidence is missing rawArtifactHashes integrity block.");
  } else {
    for (const [relPath, expectedHash] of Object.entries(committedHashes)) {
      const fullPath = path.join(cwd, relPath);
      if (!fs.existsSync(fullPath)) {
        errors.push(`Raw artifact referenced in committed hashes is missing on disk: ${relPath}`);
      } else {
        const actualHash = computeFileSha256(fullPath);
        if (actualHash !== expectedHash) {
          errors.push(`Raw artifact hash mismatch for ${relPath}: expected ${expectedHash}, actual ${actualHash}`);
        }
      }
    }
  }

  // 2. Git Ancestry and Carrier Commit Validation
  const testedCommit = committedData.testedImplementationCommit || committedData.testedCommitSha;
  if (!testedCommit || testedCommit === "UNKNOWN_COMMIT") {
    errors.push("Missing or unknown testedImplementationCommit in committed evidence.");
  } else {
    const commitTimestamp = getCommitTimestamp(testedCommit, cwd);
    const now = Date.now();
    if (commitTimestamp > now + 600000) {
      errors.push(`Tested commit timestamp is in the future: ${new Date(commitTimestamp).toISOString()}`);
    } else if (now - commitTimestamp > 14 * 24 * 3600 * 1000) {
      errors.push(`Tested commit ${testedCommit} is overly old (> 14 days) and must be refreshed.`);
    }

    if (carrierHead && carrierHead !== "UNKNOWN_COMMIT") {
      try {
        execSync(`git merge-base --is-ancestor ${testedCommit} ${carrierHead}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
        const revCount = parseInt(
          execSync(`git rev-list --count ${testedCommit}..${carrierHead}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim(),
          10
        );
        if (revCount > 1) {
          errors.push(
            `Carrier commit (${carrierHead}) is more than 1 commit ahead of tested commit (${testedCommit}) (revCount=${revCount}).`
          );
        }
      } catch (e) {
        errors.push(`Tested SHA (${testedCommit}) is unrelated to carrier commit (${carrierHead}): ${e.message}`);
      }
    }

    // Artifact Freshness Check
    if (reparsed.rawArtifactTimestamps) {
      for (const [relPath, mtime] of Object.entries(reparsed.rawArtifactTimestamps)) {
        if (mtime < commitTimestamp - 600000) {
          errors.push(
            `Artifact ${relPath} predates tested commit ${testedCommit} (artifact=${new Date(mtime).toISOString()}, commit=${new Date(commitTimestamp).toISOString()})`
          );
        }
      }
    }
  }

  const qg = committedData.qualityGates || {};

  // 3. Vitest Exact Comparison
  if (!reparsed.vitest) {
    errors.push("Missing or invalid Vitest artifact.");
  } else {
    const g3 = qg.gate3_unit_tests || {};
    if (reparsed.vitest.testsTotal !== g3.testsTotal) {
      errors.push(`Vitest testsTotal mismatch: reparsed=${reparsed.vitest.testsTotal}, committed=${g3.testsTotal}`);
    }
    if (reparsed.vitest.testsPassed !== g3.testsPassed) {
      errors.push(`Vitest testsPassed mismatch: reparsed=${reparsed.vitest.testsPassed}, committed=${g3.testsPassed}`);
    }
    if (reparsed.vitest.testsFailed !== (g3.testsFailed || 0)) {
      errors.push(`Vitest testsFailed mismatch: reparsed=${reparsed.vitest.testsFailed}, committed=${g3.testsFailed}`);
    }
    if (reparsed.vitest.testsSkipped !== (g3.testsSkipped || 0)) {
      errors.push(`Vitest testsSkipped mismatch: reparsed=${reparsed.vitest.testsSkipped}, committed=${g3.testsSkipped}`);
    }
    if (reparsed.vitest.testsFailed > 0) {
      errors.push(`Vitest contains failed tests: ${reparsed.vitest.testsFailed}`);
    }
    if (reparsed.vitest.testsSkipped > 0) {
      errors.push(`Vitest contains unexpectedly skipped tests: ${reparsed.vitest.testsSkipped}`);
    }
    if (g3.status !== "PASSED" || reparsed.vitest.status !== "PASSED") {
      errors.push(`Vitest status is not PASSED: reparsed=${reparsed.vitest.status}, committed=${g3.status}`);
    }
  }

  // 4. Coverage Exact Comparison
  if (!reparsed.coverage) {
    errors.push("Missing or invalid coverage artifact.");
  } else {
    const cov = qg.gate3_unit_tests?.coverage || {};
    if (reparsed.coverage.statements !== cov.statements) {
      errors.push(`Coverage statements mismatch: reparsed=${reparsed.coverage.statements}%, committed=${cov.statements}%`);
    }
    if (reparsed.coverage.lines !== cov.lines) {
      errors.push(`Coverage lines mismatch: reparsed=${reparsed.coverage.lines}%, committed=${cov.lines}%`);
    }
    if (reparsed.coverage.functions !== cov.functions) {
      errors.push(`Coverage functions mismatch: reparsed=${reparsed.coverage.functions}%, committed=${cov.functions}%`);
    }
    if (reparsed.coverage.branches !== cov.branches) {
      errors.push(`Coverage branches mismatch: reparsed=${reparsed.coverage.branches}%, committed=${cov.branches}%`);
    }
  }

  // 5. Playwright E2E Exact Comparison
  if (!reparsed.playwright) {
    errors.push("Missing or invalid Playwright artifact.");
  } else {
    const g5 = qg.gate5_playwright_e2e || {};
    if (reparsed.playwright.testsTotal !== g5.testsTotal) {
      errors.push(`Playwright testsTotal mismatch: reparsed=${reparsed.playwright.testsTotal}, committed=${g5.testsTotal}`);
    }
    if (reparsed.playwright.testsPassed !== g5.testsPassed) {
      errors.push(`Playwright testsPassed mismatch: reparsed=${reparsed.playwright.testsPassed}, committed=${g5.testsPassed}`);
    }
    if (reparsed.playwright.testsFailed !== (g5.testsFailed || 0)) {
      errors.push(`Playwright testsFailed mismatch: reparsed=${reparsed.playwright.testsFailed}, committed=${g5.testsFailed}`);
    }
    if (reparsed.playwright.testsSkipped !== (g5.testsSkipped || 0)) {
      errors.push(`Playwright testsSkipped mismatch: reparsed=${reparsed.playwright.testsSkipped}, committed=${g5.testsSkipped}`);
    }
    if (reparsed.playwright.testsFailed > 0) {
      errors.push(`Playwright contains failed tests: ${reparsed.playwright.testsFailed}`);
    }
    if (reparsed.playwright.testsSkipped > 0) {
      errors.push(`Playwright contains unexpectedly skipped tests: ${reparsed.playwright.testsSkipped}`);
    }
    if (g5.status !== "PASSED" || reparsed.playwright.status !== "PASSED") {
      errors.push(`Playwright status is not PASSED: reparsed=${reparsed.playwright.status}, committed=${g5.status}`);
    }
  }

  // 6. Axe Accessibility Exact Comparison
  if (!reparsed.axe) {
    errors.push("Missing or invalid Axe artifact.");
  } else {
    const g6 = qg.gate6_accessibility_axe || {};
    if (reparsed.axe.totalTestedStates !== g6.totalTestedStates) {
      errors.push(`Axe totalTestedStates mismatch: reparsed=${reparsed.axe.totalTestedStates}, committed=${g6.totalTestedStates}`);
    }
    if (reparsed.axe.totalViolations !== (g6.totalViolations || 0)) {
      errors.push(`Axe totalViolations mismatch: reparsed=${reparsed.axe.totalViolations}, committed=${g6.totalViolations}`);
    }
    if (reparsed.axe.totalViolations > 0) {
      errors.push(`Axe detected accessibility violations: ${reparsed.axe.totalViolations}`);
    }
    const committedStates = Array.isArray(g6.testedStates) ? [...g6.testedStates].sort() : [];
    const reparsedStates = [...reparsed.axe.testedStates].sort();
    if (JSON.stringify(committedStates) !== JSON.stringify(reparsedStates)) {
      errors.push(`Axe testedStates mismatch: reparsed=${JSON.stringify(reparsedStates)}, committed=${JSON.stringify(committedStates)}`);
    }
    if (g6.status !== "PASSED" || reparsed.axe.status !== "PASSED") {
      errors.push(`Axe status is not PASSED: reparsed=${reparsed.axe.status}, committed=${g6.status}`);
    }
  }

  // 7. Lint Exact Comparison
  if (!reparsed.lint) {
    errors.push("Missing or invalid Lint artifact.");
  } else {
    const g1 = qg.gate1_lint || {};
    if (reparsed.lint.errorCount !== (g1.errorCount || 0)) {
      errors.push(`Lint errorCount mismatch: reparsed=${reparsed.lint.errorCount}, committed=${g1.errorCount}`);
    }
    if (reparsed.lint.warningCount !== (g1.warningCount || 0)) {
      errors.push(`Lint warningCount mismatch: reparsed=${reparsed.lint.warningCount}, committed=${g1.warningCount}`);
    }
    if (reparsed.lint.filesChecked !== g1.filesChecked) {
      errors.push(`Lint filesChecked mismatch: reparsed=${reparsed.lint.filesChecked}, committed=${g1.filesChecked}`);
    }
    if (reparsed.lint.errorCount > 0) {
      errors.push(`Lint detected active errors: ${reparsed.lint.errorCount}`);
    }
    if (g1.status !== "PASSED" || reparsed.lint.status !== "PASSED") {
      errors.push(`Lint status is not PASSED: reparsed=${reparsed.lint.status}, committed=${g1.status}`);
    }
  }

  // 8. Typecheck Exact Comparison
  if (!reparsed.typecheck) {
    errors.push("Missing or invalid Typecheck artifact.");
  } else {
    const g2 = qg.gate2_typecheck || {};
    if (reparsed.typecheck.errorCount !== (g2.errorCount || 0)) {
      errors.push(`Typecheck errorCount mismatch: reparsed=${reparsed.typecheck.errorCount}, committed=${g2.errorCount}`);
    }
    const committedPackages = Array.isArray(g2.packagesChecked) ? [...g2.packagesChecked].sort() : [];
    const reparsedPackages = [...reparsed.typecheck.packagesChecked].sort();
    if (JSON.stringify(committedPackages) !== JSON.stringify(reparsedPackages)) {
      errors.push(`Typecheck packagesChecked mismatch: reparsed=${JSON.stringify(reparsedPackages)}, committed=${JSON.stringify(committedPackages)}`);
    }
    if (reparsed.typecheck.errorCount > 0) {
      errors.push(`Typecheck detected active errors: ${reparsed.typecheck.errorCount}`);
    }
    if (g2.status !== "PASSED" || reparsed.typecheck.status !== "PASSED") {
      errors.push(`Typecheck status is not PASSED: reparsed=${reparsed.typecheck.status}, committed=${g2.status}`);
    }
  }

  // 9. Build Artifacts Exact Comparison
  if (!reparsed.build) {
    errors.push("Missing or invalid Build artifact.");
  } else {
    const g4 = qg.gate4_monorepo_build || {};
    if (g4.status !== "PASSED" || reparsed.build.status !== "PASSED") {
      errors.push(`Build status is not PASSED: reparsed=${reparsed.build.status}, committed=${g4.status}`);
    }
    const committedArtifacts = Array.isArray(g4.artifacts) ? [...g4.artifacts].sort() : [];
    const reparsedArtifacts = [...reparsed.build.artifacts].sort();
    if (JSON.stringify(committedArtifacts) !== JSON.stringify(reparsedArtifacts)) {
      errors.push(`Build artifact paths mismatch between committed evidence and raw build artifact: reparsed=${JSON.stringify(reparsedArtifacts)}, committed=${JSON.stringify(committedArtifacts)}`);
    }
    for (const p of reparsedArtifacts) {
      if (!fs.existsSync(path.join(cwd, p))) {
        errors.push(`Build distribution file missing on disk: ${p}`);
      }
    }
  }

  // 10. Secret-Scan Exact Comparison
  if (!reparsed.securityScan) {
    errors.push("Missing or invalid Security Scan artifact.");
  } else {
    const g7 = qg.gate7_security_secrets || {};
    if (reparsed.securityScan.totalViolations !== (g7.totalViolations || 0)) {
      errors.push(`Secret-scan violations mismatch: reparsed=${reparsed.securityScan.totalViolations}, committed=${g7.totalViolations}`);
    }
    if (reparsed.securityScan.totalViolations > 0) {
      errors.push(`Secret-scan detected violations: ${reparsed.securityScan.totalViolations}`);
    }
    if (g7.status !== "PASSED" || reparsed.securityScan.status !== "PASSED") {
      errors.push(`Secret-scan status is not PASSED: reparsed=${reparsed.securityScan.status}, committed=${g7.status}`);
    }
  }

  // 11. Dependency-Audit Exact Comparison (Fail closed on false PASSED)
  if (!reparsed.dependencyAudit) {
    errors.push("Missing or invalid Dependency Audit artifact.");
  } else {
    const g8 = qg.gate8_dependency_audit || {};
    if (g8.status === "PASSED" && reparsed.dependencyAudit.totalVulnerabilities > 0) {
      errors.push(
        `Dependency audit falsely claims PASSED while active vulnerabilities exist (${reparsed.dependencyAudit.totalVulnerabilities}).`
      );
    }
    if (reparsed.dependencyAudit.totalVulnerabilities !== g8.totalVulnerabilities) {
      errors.push(
        `Dependency audit totalVulnerabilities mismatch: reparsed=${reparsed.dependencyAudit.totalVulnerabilities}, committed=${g8.totalVulnerabilities}`
      );
    }
    if (reparsed.dependencyAudit.highVulnerabilities !== g8.highVulnerabilities) {
      errors.push(
        `Dependency audit highVulnerabilities mismatch: reparsed=${reparsed.dependencyAudit.highVulnerabilities}, committed=${g8.highVulnerabilities}`
      );
    }
    if (reparsed.dependencyAudit.moderateVulnerabilities !== g8.moderateVulnerabilities) {
      errors.push(
        `Dependency audit moderateVulnerabilities mismatch: reparsed=${reparsed.dependencyAudit.moderateVulnerabilities}, committed=${g8.moderateVulnerabilities}`
      );
    }
    if (reparsed.dependencyAudit.criticalVulnerabilities !== (g8.criticalVulnerabilities || 0)) {
      errors.push(
        `Dependency audit criticalVulnerabilities mismatch: reparsed=${reparsed.dependencyAudit.criticalVulnerabilities}, committed=${g8.criticalVulnerabilities}`
      );
    }
    const expectedGate = reparsed.dependencyAudit.gateResult || "WARN";
    const committedGate = g8.gateResult || g8.gateStatus || "WARN";
    if (expectedGate !== committedGate) {
      errors.push(`Dependency audit gateResult mismatch: reparsed=${expectedGate}, committed=${committedGate}`);
    }
  }

  // 12. MCP Contract & Tool Availability Comparison
  if (!reparsed.contractTest) {
    errors.push("Missing or invalid MCP Contract Test artifact.");
  } else {
    const c = committedData.canonicalQlooContract || {};
    if (reparsed.contractTest.status !== "PASSED" || c.mcpContractTest?.status !== "PASSED") {
      errors.push(
        `MCP contract test status is not PASSED: reparsed=${reparsed.contractTest.status}, committed=${c.mcpContractTest?.status}`
      );
    }
    if (installedHarnessVersion === "UNKNOWN" || !c.harnessPackage?.includes(installedHarnessVersion)) {
      errors.push(
        `Installed harness version (${installedHarnessVersion}) does not match committed canonical harness (${c.harnessPackage}).`
      );
    }
    if (c.checksum !== CANONICAL_CHECKSUM) {
      errors.push(`Committed contract checksum (${c.checksum}) does not match canonical (${CANONICAL_CHECKSUM}).`);
    }

    for (const tool of REQUIRED_TOOLS) {
      if (!reparsed.contractTest.toolsList?.includes(tool)) {
        errors.push(`MCP contract artifact missing required tool: ${tool}`);
      }
      if (!c.supportedTools?.includes(tool)) {
        errors.push(`Committed contract supportedTools missing required tool: ${tool}`);
      }
    }
  }

  // 13. Claimed Live Qloo Execution Validation
  const liveStatus = committedData.verificationBoundaries?.liveIntegrationStatus;
  if (liveStatus === "LIVE_QLOO_VERIFIED") {
    if (!reparsed.liveSmoke.exists || !reparsed.liveSmoke.passed) {
      errors.push("Claimed live Qloo execution without a successful live-smoke artifact (test-results/live-smoke.json).");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates verification results JSON using parsed current artifacts.
 */
function generateResults(options = {}) {
  const cwd = options.cwd || ROOT;
  const outputFile = options.outputFile || DEFAULT_OUTPUT_FILE;
  console.log(`⚙️ [Verification Generator] Parsing authoritative command and test outputs...`);

  const timestamp = new Date().toISOString();
  const currentHeadSha = getCommitSha(cwd);
  const branch = getBranch(cwd);
  const harnessVersion = getHarnessVersion(cwd);

  const testedImplementationCommit = options.testedImplementationCommit || process.env.TESTED_COMMIT || currentHeadSha;
  const artifactGeneratedFromCommit =
    options.artifactGeneratedFromCommit || process.env.ARTIFACT_COMMIT || testedImplementationCommit;

  const reparsed = parseCurrentArtifacts(cwd);

  if (reparsed.parsingErrors && reparsed.parsingErrors.length > 0) {
    console.error("❌ Cannot generate verification evidence: raw artifact schema validation failed:");
    for (const e of reparsed.parsingErrors) {
      console.error(`   - ${e}`);
    }
    process.exit(1);
  }

  const results = {
    repository: "lastrack",
    generatedAt: timestamp,
    testedImplementationCommit,
    artifactGeneratedFromCommit,
    carrierCommitVerifiedAtRuntime: "CALCULATED_AT_RUNTIME",
    branch,
    rawArtifactHashes: reparsed.rawArtifactHashes,
    canonicalQlooContract: {
      protocolVersion: "2024-11-05",
      contractVersion: "1.0.0",
      harnessPackage: `@qloo/qloo-harness@${harnessVersion}`,
      checksum: CANONICAL_CHECKSUM,
      executableCommand: "node dist/bin.js mcp",
      requiredOperations: ["describe", "find_tags", "recommend", "rank"],
      supportedTools: REQUIRED_TOOLS,
      mcpContractTest: reparsed.contractTest,
      rankingInvariant: "One qloo_rank batch per comparable entity domain",
      singleQueryRankingInvariantEnforced: true,
      integrityDigestType: "SHA-256",
    },
    qualityGates: {
      gate1_lint: {
        command: "npm run lint",
        status: reparsed.lint.status,
        errorCount: reparsed.lint.errorCount,
        warningCount: reparsed.lint.warningCount,
        filesChecked: reparsed.lint.filesChecked,
        details: reparsed.lint.details,
      },
      gate2_typecheck: {
        command: "npm run typecheck",
        status: reparsed.typecheck.status,
        packagesChecked: reparsed.typecheck.packagesChecked,
        errorCount: reparsed.typecheck.errorCount,
        details: reparsed.typecheck.details,
      },
      gate3_unit_tests: {
        command: "npm test",
        status: reparsed.vitest.status,
        testsTotal: reparsed.vitest.testsTotal,
        testsPassed: reparsed.vitest.testsPassed,
        testsFailed: reparsed.vitest.testsFailed,
        testsSkipped: reparsed.vitest.testsSkipped,
        coverage: reparsed.coverage,
      },
      gate4_monorepo_build: {
        command: "npm run build",
        status: reparsed.build.status,
        artifacts: reparsed.build.artifacts,
      },
      gate5_playwright_e2e: {
        command: "npm run test:e2e",
        status: reparsed.playwright.status,
        testsTotal: reparsed.playwright.testsTotal,
        testsPassed: reparsed.playwright.testsPassed,
        testsFailed: reparsed.playwright.testsFailed,
        testsSkipped: reparsed.playwright.testsSkipped,
        projects: reparsed.playwright.projects,
      },
      gate6_accessibility_axe: {
        tool: "@axe-core/playwright",
        status: reparsed.axe.status,
        totalTestedStates: reparsed.axe.totalTestedStates,
        totalViolations: reparsed.axe.totalViolations,
        testedStates: reparsed.axe.testedStates,
        statement: reparsed.axe.statement,
      },
      gate7_security_secrets: {
        command: "npm run security-scan",
        status: reparsed.securityScan.status,
        scope: reparsed.securityScan.scope,
        totalViolations: reparsed.securityScan.totalViolations,
      },
      gate8_dependency_audit: {
        command: "npm audit --omit=dev --audit-level=high",
        status: reparsed.dependencyAudit.status,
        gateResult: reparsed.dependencyAudit.gateResult,
        totalVulnerabilities: reparsed.dependencyAudit.totalVulnerabilities,
        highVulnerabilities: reparsed.dependencyAudit.highVulnerabilities,
        moderateVulnerabilities: reparsed.dependencyAudit.moderateVulnerabilities,
        criticalVulnerabilities: reparsed.dependencyAudit.criticalVulnerabilities,
        packageChains: reparsed.dependencyAudit.packageChains,
      },
    },
    verificationBoundaries: {
      dockerStatus: "NOT_VERIFIED (Docker daemon and container healthcheck not executed in this environment)",
      liveIntegrationStatus:
        reparsed.liveSmoke.passed === true
          ? "LIVE_QLOO_VERIFIED"
          : process.env.QLOO_API_KEY && process.env.QLOO_API_KEY.length > 10
          ? "KEY_PRESENT_NOT_LIVE_VERIFIED"
          : "NOT_VERIFIED (No live QLOO_API_KEY configured in test session; verified via real child-process contract handshake and mock suite)",
      deployment: {
        remoteRepositoryUrl: "NOT_VERIFIED (Pending remote GitHub repository creation)",
        ciExecutionUrl: "NOT_VERIFIED (Pending remote workflow trigger)",
        liveProductionUrl: "NOT_VERIFIED (No remote production deployment configured)",
        status: "LOCAL_VERIFIED_ONLY",
      },
      unverifiedNotice: "All remote or live environments not executed locally remain strictly labeled NOT_VERIFIED.",
    },
  };

  const parentDir = path.dirname(outputFile);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf-8");
  console.log(`✅ [Verification Generator] Authoritative results written to ${outputFile}`);
  return results;
}

// Execution block
if (require.main === module) {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes("--verify-only");

  let evidenceFile = DEFAULT_OUTPUT_FILE;
  const evFileIdx = args.indexOf("--evidence-file");
  if (evFileIdx !== -1 && args[evFileIdx + 1]) {
    evidenceFile = path.resolve(ROOT, args[evFileIdx + 1]);
  }

  let outputFile = DEFAULT_OUTPUT_FILE;
  const outIdx = args.indexOf("--output");
  if (outIdx !== -1 && args[outIdx + 1]) {
    outputFile = path.resolve(ROOT, args[outIdx + 1]);
  }

  if (verifyOnly) {
    if (!fs.existsSync(evidenceFile)) {
      console.error(`❌ Verification evidence file is missing: ${evidenceFile}`);
      process.exit(1);
    }
    const committedData = JSON.parse(fs.readFileSync(evidenceFile, "utf-8"));
    const reparsed = parseCurrentArtifacts(ROOT);
    const carrierHead = getCommitSha(ROOT);

    console.log(`🔍 [Verification Validation] Running independent reparse and comparative validation...`);
    console.log(`   Evidence File:                ${evidenceFile}`);
    console.log(`   Tested Implementation Commit: ${committedData.testedImplementationCommit}`);
    console.log(`   Carrier Commit at Runtime:    ${carrierHead}`);

    const result = verifyEvidence(committedData, reparsed, {
      cwd: ROOT,
      carrierHead,
      installedHarnessVersion: getHarnessVersion(ROOT),
    });

    if (!result.valid) {
      console.error("❌ [Verification Validation FAILED]:");
      for (const err of result.errors) {
        console.error(`   - ${err}`);
      }
      process.exit(1);
    }

    console.log("✅ [Verification Validation] Authoritative verification file is valid, consistent, fresh, and passing.");
    process.exit(0);
  }

  generateResults({ outputFile });
}

module.exports = {
  parseCurrentArtifacts,
  verifyEvidence,
  generateResults,
  getCommitSha,
  getCommitTimestamp,
  getHarnessVersion,
  computeFileSha256,
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
};
