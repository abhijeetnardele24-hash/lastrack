import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";

test.describe("Automated Accessibility Scans with @axe-core/playwright", () => {
  const scanResults: Record<string, any> = {};

  test.afterAll(async () => {
    // Save automated axe scan results machine-readably
    const outDir = path.resolve(process.cwd(), "test-results");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(outDir, "axe-results.json"),
      JSON.stringify(scanResults, null, 2)
    );
  });

  test("scan initial state", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // Optional contrast rule relaxation for custom design tokens
      .analyze();

    scanResults["initial_state"] = {
      violationsCount: accessibilityScanResults.violations.length,
      violations: accessibilityScanResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
      })),
    };

    expect(accessibilityScanResults.violations.filter((v) => v.impact === "critical").length).toBe(0);
  });

  test("scan complete / loaded state with interventions", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#intervention-board");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    scanResults["complete_state"] = {
      violationsCount: accessibilityScanResults.violations.length,
      violations: accessibilityScanResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
      })),
    };

    expect(accessibilityScanResults.violations.filter((v) => v.impact === "critical").length).toBe(0);
  });

  test("scan ablation modal state", async ({ page }) => {
    await page.goto("/");
    await page.locator("button:has-text('Why Qloo? (Ablation)')").click();
    await page.waitForSelector("#ablation-modal");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    scanResults["ablation_modal"] = {
      violationsCount: accessibilityScanResults.violations.length,
      violations: accessibilityScanResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
      })),
    };

    expect(accessibilityScanResults.violations.filter((v) => v.impact === "critical").length).toBe(0);
    await page.keyboard.press("Escape");
  });

  test("scan decision receipt modal state", async ({ page }) => {
    await page.goto("/");
    await page.locator("button:has-text('Select & Export Experiment')").first().click();
    await page.waitForSelector("#receipt-modal");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    scanResults["receipt_modal"] = {
      violationsCount: accessibilityScanResults.violations.length,
      violations: accessibilityScanResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
      })),
    };

    expect(accessibilityScanResults.violations.filter((v) => v.impact === "critical").length).toBe(0);
    await page.keyboard.press("Escape");
  });

  test("scan evidence drawer state", async ({ page }) => {
    await page.goto("/");
    const evidenceChip = page.locator("button[title*='Click to view verified evidence node']").first();
    await evidenceChip.click();
    await page.waitForSelector("#evidence-drawer");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();

    scanResults["evidence_drawer"] = {
      violationsCount: accessibilityScanResults.violations.length,
      violations: accessibilityScanResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
      })),
    };

    expect(accessibilityScanResults.violations.filter((v) => v.impact === "critical").length).toBe(0);
  });
});
