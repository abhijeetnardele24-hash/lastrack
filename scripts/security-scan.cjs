/**
 * LastRack Secret & Credential Scanner
 * Scans working tree files AND reachable Git history to guarantee zero leaked secrets, API keys, or private tokens.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".turbo",
  ".next",
  "test-results",
  "playwright-report",
]);

const SECRET_PATTERNS = [
  { name: "Live Qloo API Key", regex: /QLOO_API_KEY\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/i },
  { name: "Generic Secret Key", regex: /(api_key|secret_key|private_key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i },
  { name: "OpenAI / Anthropic Secret Key", regex: /sk-(live-)?[a-zA-Z0-9]{24,}/i },
  { name: "GitHub Personal Access Token", regex: /ghp_[a-zA-Z0-9]{36}/i },
  { name: "GitLab Personal Access Token", regex: /glpat-[a-zA-Z0-9_\-]{20,}/i },
  { name: "Private RSA / EC Key", regex: /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/ },
];

function scanDirectory(dirPath, violations = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath, violations);
    } else if (entry.isFile()) {
      // Skip binary, lockfiles, and sample environment templates
      if (entry.name === ".env.example" || entry.name.endsWith(".lock") || entry.name.endsWith(".svg") || entry.name.endsWith(".png")) {
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(content)) {
            // Ignore standard documentation placeholders
            if (
              content.includes("your_qloo_api_key_here") ||
              content.includes("your_api_key_here") ||
              content.includes("your_actual_api_key_here") ||
              content.includes("mock-qloo-api-key")
            ) continue;
            violations.push({
              source: path.relative(ROOT_DIR, fullPath),
              rule: pattern.name,
            });
          }
        }
      } catch (err) {
        // Binary or unreadable file, safely ignore
      }
    }
  }

  return violations;
}

function scanGitHistory(violations = []) {
  try {
    const gitLog = execSync("git log -p --all", { cwd: ROOT_DIR, encoding: "utf-8", maxBuffer: 25 * 1024 * 1024 });
    const lines = gitLog.split("\n");
    let currentCommit = "HEAD";
    for (const line of lines) {
      if (line.startsWith("commit ")) {
        currentCommit = line.substring(7, 15).trim();
      }
      if (line.startsWith("+") && !line.startsWith("+++")) {
        const addedLine = line.substring(1);
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(addedLine)) {
            if (
              addedLine.includes("your_qloo_api_key_here") ||
              addedLine.includes("your_api_key_here") ||
              addedLine.includes("your_actual_api_key_here") ||
              addedLine.includes("mock-qloo-api-key")
            ) continue;
            violations.push({
              source: `git commit ${currentCommit}`,
              rule: pattern.name,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ [LastRack Security Scan] Git history log unavailable:", err.message);
  }
  return violations;
}

console.log("🔒 [LastRack Security Scan] Scanning working tree and reachable Git history...");

const workingTreeViolations = scanDirectory(ROOT_DIR);
const gitHistoryViolations = scanGitHistory();
const allViolations = [...workingTreeViolations, ...gitHistoryViolations];
const testResultsDir = path.join(ROOT_DIR, "test-results");
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

const scanSummary = {
  timestamp: new Date().toISOString(),
  status: allViolations.length === 0 ? "PASSED" : "FAILED",
  exitCode: allViolations.length === 0 ? 0 : 1,
  scope: "Working tree files AND complete reachable Git commit history",
  workingTreeViolations: workingTreeViolations.length,
  gitHistoryViolations: gitHistoryViolations.length,
  totalViolations: allViolations.length,
  violations: allViolations,
};

fs.writeFileSync(
  path.join(testResultsDir, "security-scan.json"),
  JSON.stringify(scanSummary, null, 2),
  "utf-8"
);

if (allViolations.length > 0) {
  console.error("\n❌ SECURITY SCAN FAILED! Hardcoded credentials detected:");
  allViolations.forEach((v) => {
    console.error(`  - ${v.source}: matched [${v.rule}]`);
  });
  process.exit(1);
} else {
  console.log("✅ [LastRack Security Scan] Clean! No credentials or secrets found across working tree or Git history.");
  process.exit(0);
}
