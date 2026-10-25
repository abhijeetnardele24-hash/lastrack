const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "test-results");
const OUT_FILE = path.join(OUT_DIR, "typecheck-results.json");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log("🔍 [LastRack Typecheck] Running TypeScript typecheck across all workspaces...");

const packages = [
  "@lastrack/contracts",
  "@lastrack/domain",
  "@lastrack/fixtures",
  "@lastrack/server",
  "@lastrack/web"
];

let errorCount = 0;
let errors = [];

try {
  // Build internal package declarations first so consumers can resolve types cleanly
  execSync("npm run build --workspace=@lastrack/contracts && npm run build --workspace=@lastrack/domain && npm run build --workspace=@lastrack/fixtures", {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  execSync("npm run typecheck:workspaces", {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch (err) {
  errorCount = 1;
  errors.push(err.stderr?.toString() || err.stdout?.toString() || err.message);
}

const status = errorCount === 0 ? "PASSED" : "FAILED";

const result = {
  timestamp: new Date().toISOString(),
  status,
  packagesChecked: packages,
  errorCount,
  errors: errors.length > 0 ? errors : undefined,
  details: status === "PASSED" ? "TypeScript 5.7 tsc -b clean across all workspaces" : "TypeScript typecheck failed"
};

fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), "utf-8");

if (status === "PASSED") {
  console.log(`✅ [LastRack Typecheck] Passed! 0 errors across ${packages.length} workspaces.`);
  process.exit(0);
} else {
  console.error(`❌ [LastRack Typecheck] Failed with errors.`);
  process.exit(1);
}
