const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "test-results");
const OUT_FILE = path.join(OUT_DIR, "lint-results.json");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log("🔍 [LastRack Lint] Running ESLint across workspace...");

let rawJson = "";
let exitCode = 0;

try {
  rawJson = execSync('npx eslint "**/*.{ts,tsx,js,jsx}" --format json', {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch (err) {
  rawJson = err.stdout?.toString() || "[]";
  exitCode = err.status || 1;
}

let errorCount = 0;
let warningCount = 0;
let filesChecked = 0;

try {
  const parsed = JSON.parse(rawJson);
  if (Array.isArray(parsed)) {
    filesChecked = parsed.length;
    for (const file of parsed) {
      errorCount += file.errorCount || 0;
      warningCount += file.warningCount || 0;
    }
  }
} catch (e) {
  console.warn("Could not parse ESLint JSON output:", e.message);
}

const status = exitCode === 0 && errorCount === 0 ? "PASSED" : "FAILED";

const result = {
  timestamp: new Date().toISOString(),
  status,
  exitCode,
  errorCount,
  warningCount,
  filesChecked,
  details: status === "PASSED" ? "ESLint flat config clean across all files" : `ESLint failed with ${errorCount} error(s)`
};

fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), "utf-8");

if (status === "PASSED") {
  console.log(`✅ [LastRack Lint] Passed! ${filesChecked} files checked with 0 errors and ${warningCount} warnings.`);
  process.exit(0);
} else {
  console.error(`❌ [LastRack Lint] Failed with ${errorCount} error(s).`);
  process.exit(1);
}
