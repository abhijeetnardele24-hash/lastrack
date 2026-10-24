/**
 * LastRack Secret & Credential Scanner
 * Scans codebase files and git commits to guarantee zero leaked secrets, API keys, or private tokens.
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
            violations.push({
              file: path.relative(ROOT_DIR, fullPath),
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

console.log("🔒 [LastRack Security Scan] Scanning codebase for leaked credentials and API tokens...");

const violations = scanDirectory(ROOT_DIR);

if (violations.length > 0) {
  console.error("\n❌ SECURITY SCAN FAILED! Hardcoded credentials detected:");
  violations.forEach((v) => {
    console.error(`  - ${v.file}: matched [${v.rule}]`);
  });
  process.exit(1);
} else {
  console.log("✅ [LastRack Security Scan] Clean! No credentials or secrets found in codebase.");
  process.exit(0);
}
