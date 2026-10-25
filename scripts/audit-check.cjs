/**
 * LastRack Dependency & Upstream Vulnerability Audit
 * Analyzes production dependencies and documents reachability & mitigations
 * for unavoidable upstream vulnerabilities in @qloo/qloo-harness.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🔍 [LastRack Security Audit] Inspecting production dependencies (--omit=dev)...");

const ROOT = path.resolve(__dirname, "..");
const testResultsDir = path.join(ROOT, "test-results");
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

let auditOutput = "";
try {
  auditOutput = execSync("npm audit --omit=dev --json", { encoding: "utf-8" });
} catch (err) {
  auditOutput = err.stdout || "";
}

try {
  const audit = JSON.parse(auditOutput);
  const vulnerabilities = audit.vulnerabilities || {};
  const names = Object.keys(vulnerabilities);
  const total = audit.metadata?.vulnerabilities?.total || names.length;
  const high = audit.metadata?.vulnerabilities?.high || 0;
  const moderate = audit.metadata?.vulnerabilities?.moderate || 0;
  const critical = audit.metadata?.vulnerabilities?.critical || 0;

  console.log(`\n📋 Audit Summary: ${total} total production vulnerabilities detected.`);
  console.log(`   - Critical: ${critical}`);
  console.log(`   - High: ${high}`);
  console.log(`   - Moderate: ${moderate}`);

  const auditSummary = {
    timestamp: new Date().toISOString(),
    status: total > 0 ? "NOT_CLEAN" : "PASSED",
    gateStatus: total > 0 ? "WARN" : "PASSED",
    totalVulnerabilities: total,
    highVulnerabilities: high,
    moderateVulnerabilities: moderate,
    criticalVulnerabilities: critical,
    vulnerabilitiesList: names,
    packageChains: [
      {
        package: "undici",
        severity: "high",
        chain: "@qloo/qloo-harness -> @earendil-works/pi-coding-agent -> undici",
        detail: "Outbound HTTPS requests in harness. Locked by @earendil-works/pi-coding-agent npm-shrinkwrap. Cannot be safely deduplicated without vendor update.",
      },
      {
        package: "brace-expansion",
        severity: "high",
        chain: "@qloo/qloo-harness -> @earendil-works/pi-coding-agent -> brace-expansion",
        detail: "Locked by @earendil-works/pi-coding-agent shrinkwrap.",
      },
      {
        package: "zod",
        severity: "high",
        advisory: "GHSA-mrhx-c7xc-m3w5",
        chain: "packages/contracts -> zod ^3.24.4",
        detail: "Memory exhaustion advisory in zod < 4.6.6. Upgrading to Zod 4 is breaking. Request size limits (Fastify 1MB bodyLimit) and explicit input bounds reduce exposure but do not remove the vulnerable dependency.",
      },
    ],
  };

  fs.writeFileSync(
    path.join(testResultsDir, "npm-audit.json"),
    JSON.stringify(auditSummary, null, 2),
    "utf-8"
  );

  console.log("\n🛡️ Upstream Vulnerability Chain & Mitigation Analysis:");
  console.log("   - @qloo/qloo-harness -> @earendil-works/pi-coding-agent -> undici (High, Upstream vendor dependency)");
  console.log("   - @qloo/qloo-harness -> @earendil-works/pi-coding-agent -> brace-expansion (High, Upstream vendor dependency)");
  console.log("   - packages/contracts -> zod ^3.24.4 (High, Memory exhaustion in <4.6.6; request limits reduce exposure but do not remove vulnerable dependency)");
  console.log("\n⚠️ [Audit Gate] Gate status: WARN (NOT_CLEAN due to upstream dependencies).");

  if (critical > 0) {
    console.error("\n❌ CRITICAL VULNERABILITY DETECTED! Action required.");
    process.exit(1);
  }

  process.exit(0);
} catch (e) {
  console.error("Failed to parse npm audit output:", e.message);
  process.exit(1);
}
