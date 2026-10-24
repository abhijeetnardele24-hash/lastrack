/**
 * Asset Capture & Verification Script
 * - Renders architecture.png from architecture.svg
 * - Captures 5 real application screenshots into docs/assets/screenshots/
 * - Generates 1280x720 Devpost thumbnail into docs/assets/thumbnail.png
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(ROOT, "docs", "assets");
const SCREENSHOTS_DIR = path.join(ASSETS_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function main() {
  console.log("🎨 [Asset Capture] Starting asset generation and screenshot capture...");

  // Start Fastify server in background
  const serverProcess = spawn("node", ["apps/server/dist/server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: "3002", NODE_ENV: "production" },
    stdio: "pipe",
  });

  // Wait for server to boot
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    // 1. Render architecture.png from architecture.svg
    console.log("Rendering docs/assets/architecture.png from SVG...");
    const svgContent = fs.readFileSync(path.join(ASSETS_DIR, "architecture.svg"), "utf-8");
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><style>body { margin: 0; background: #14201C; }</style></head>
        <body>
          <div id="svg-container" style="display: inline-block;">
            ${svgContent}
          </div>
        </body>
      </html>
    `);
    const svgElem = await page.locator("#svg-container");
    await svgElem.screenshot({ path: path.join(ASSETS_DIR, "architecture.png") });
    console.log("✅ architecture.png rendered.");

    // 2. Capture Real App Screenshots
    const appUrl = "http://127.0.0.1:3002";
    console.log(`Navigating to ${appUrl} for live application screenshots...`);
    await page.goto(appUrl, { waitUntil: "networkidle" });

    // Screenshot 1: Overview & Brief Form
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01-overview-brief-form.png") });
    console.log("✅ 01-overview-brief-form.png captured.");

    // Screenshot 2: Interventions Board
    const interventionBoard = page.locator("#intervention-board");
    await interventionBoard.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02-interventions-board.png") });
    console.log("✅ 02-interventions-board.png captured.");

    // Screenshot 3: Ablation Modal (The Qloo Indispensability Test)
    await page.locator("#ablation-toggle-btn").click();
    await page.waitForSelector("#ablation-modal");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03-ablation-comparison-modal.png") });
    console.log("✅ 03-ablation-comparison-modal.png captured.");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Screenshot 4: Decision Receipt Modal
    await page.locator("button:has-text('Select & Export Experiment')").first().click();
    await page.waitForSelector("#receipt-modal");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04-decision-receipt-modal.png") });
    console.log("✅ 04-decision-receipt-modal.png captured.");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Screenshot 5: Supporting Evidence Drawer
    await page.locator("button[title*='Click to view verified evidence node']").first().click();
    await page.waitForSelector("text=Supporting Evidence Ledger");
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "05-evidence-drawer.png") });
    console.log("✅ 05-evidence-drawer.png captured.");
    await page.locator("button[title='Close Drawer']").click();
    await page.waitForTimeout(300);

    // 3. Generate 1280x720 Devpost Thumbnail
    console.log("Generating 1280x720 Devpost thumbnail...");
    const thumbnailPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await thumbnailPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: 1280px;
              height: 720px;
              background: linear-gradient(135deg, #101B17 0%, #162621 50%, #0D1613 100%);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #F4F6F4;
              display: flex;
              flex-direction: column;
              justifyContent: space-between;
              padding: 60px 80px;
              position: relative;
              overflow: hidden;
            }
            .grid-bg {
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              background-image: linear-gradient(rgba(31, 107, 79, 0.08) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(31, 107, 79, 0.08) 1px, transparent 1px);
              background-size: 40px 40px;
              pointer-events: none;
            }
            .badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 6px 14px;
              background: rgba(31, 107, 79, 0.25);
              border: 1px solid rgba(31, 107, 79, 0.6);
              border-radius: 20px;
              font-size: 14px;
              font-weight: 700;
              color: #55B98F;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              width: fit-content;
            }
            .title {
              font-size: 68px;
              font-weight: 900;
              letter-spacing: -2px;
              line-height: 1.05;
              color: #FFFFFF;
              margin-top: 20px;
            }
            .title span {
              color: #55B98F;
            }
            .subtitle {
              font-size: 24px;
              font-weight: 400;
              color: #B2BDB7;
              max-width: 850px;
              line-height: 1.4;
              margin-top: 16px;
            }
            .pillars {
              display: flex;
              gap: 20px;
              margin-top: 30px;
            }
            .pillar {
              flex: 1;
              background: rgba(23, 37, 32, 0.85);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 12px;
              padding: 18px 24px;
            }
            .pillar-label {
              font-size: 12px;
              font-weight: 700;
              color: #B94F32;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .pillar-title {
              font-size: 16px;
              font-weight: 700;
              color: #F4F6F4;
              margin-top: 4px;
            }
            .footer {
              display: flex;
              justifyContent: space-between;
              align-items: center;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              padding-top: 20px;
              font-size: 14px;
              color: #7E8D86;
            }
          </style>
        </head>
        <body>
          <div class="grid-bg"></div>
          <div>
            <div class="badge">Official Qloo Hackathon Submission</div>
            <h1 class="title">LAST<span>RACK</span></h1>
            <p class="subtitle">Turn slow stock into a culturally grounded experiment before cutting the price.</p>
            <div class="pillars">
              <div class="pillar">
                <div class="pillar-label">Autonomous Agent</div>
                <div class="pillar-title">Bounded Qloo MCP Controller</div>
              </div>
              <div class="pillar">
                <div class="pillar-label">Math Invariant</div>
                <div class="pillar-title">Single-Query Batch Ranking</div>
              </div>
              <div class="pillar">
                <div class="pillar-label">Verifiable Output</div>
                <div class="pillar-title">Decision Receipts (SHA-256)</div>
              </div>
            </div>
          </div>
          <div class="footer">
            <span>Autonomous Retail Merchandising Intelligence</span>
            <span>TypeScript • Fastify • React • Qloo MCP Protocol 2024-11-05</span>
          </div>
        </body>
      </html>
    `);
    await thumbnailPage.screenshot({ path: path.join(ASSETS_DIR, "thumbnail.png") });
    console.log("✅ thumbnail.png generated (1280x720).");

    await thumbnailPage.close();
  } finally {
    await browser.close();
    serverProcess.kill();
  }

  console.log("🎉 [Asset Capture] All submission assets and screenshots generated successfully!");
}

main().catch((err) => {
  console.error("Asset generation error:", err);
  process.exit(1);
});
