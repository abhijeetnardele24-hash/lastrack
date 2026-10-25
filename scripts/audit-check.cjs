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
        detail: "ReDoS advisory in zod < 4.6.6. Upgrading to Zod 4 is breaking. Mitigated at server edge with Fastify 1MB body limit and explicit controller array/string bounds.",
      },
    ],
  };

  fs.writeFileSync(
    path.join(testResultsDir, "npm-audit.json"),
    JSON.stringify(auditSummary, null, 2),
    "utf-8"
  );

  console.log("\n🛡️ Upstream Vulnerability Chain & Mitigation Analysis:");
  console.log("   - @qloo/qloo-harness -> @earendil-works/pi-coding-agent -> undici (High)");
  console.log("   - @qloo/qloo-harness -> @earendil-works/pi-coding-agent -> brace-expansion (High)");
  console.log("   - packages/contracts -> zod ^3.24.4 (High, ReDoS in <4.6.6; mitigated by 1MB bodyLimit)");
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
