const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "test-results");
const OUT_FILE = path.join(OUT_DIR, "build-results.json");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log("🔨 [LastRack Build] Building monorepo packages and apps...");

let buildFailed = false;
let buildError = null;

try {
  execSync("npm run build:workspaces", {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: "inherit",
  });
} catch (err) {
  buildFailed = true;
  buildError = err.message;
}

const webDist = path.join(ROOT, "apps/web/dist/index.html");
const serverDist = path.join(ROOT, "apps/server/dist/server.js");

const webExists = fs.existsSync(webDist);
const serverExists = fs.existsSync(serverDist);

const artifacts = [];
if (webExists) {
  const stat = fs.statSync(webDist);
  artifacts.push({
    name: "web-spa",
    path: "apps/web/dist/index.html",
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
  });
}
if (serverExists) {
  const stat = fs.statSync(serverDist);
  artifacts.push({
    name: "server-bundle",
    path: "apps/server/dist/server.js",
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
  });
}

const status = !buildFailed && webExists && serverExists ? "PASSED" : "FAILED";
const exitCode = status === "PASSED" ? 0 : 1;

const result = {
  timestamp: new Date().toISOString(),
  status,
  exitCode,
  artifacts,
  details: status === "PASSED" ? "All web and server production artifacts built successfully" : buildError || "Missing dist artifacts"
};

fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), "utf-8");

if (status === "PASSED") {
  console.log(`✅ [LastRack Build] Passed! Generated ${artifacts.length} production bundle artifacts.`);
  process.exit(0);
} else {
  console.error(`❌ [LastRack Build] Failed to build artifacts.`);
  process.exit(1);
}
