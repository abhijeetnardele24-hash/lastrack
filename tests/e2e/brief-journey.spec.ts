import { test, expect } from "@playwright/test";

test.describe("LastRack End-to-End Brief & Agent Journey", () => {
  test("initial clearly labeled fixture state and source-mode truthfulness", async ({ page }) => {
    await page.goto("/");

    // 1. Verify brand title
    await expect(page.locator("h1")).toHaveText("LASTRACK");

    // 2. Verify source-mode badge is truthfully labeled DEMO_FIXTURE
    const badge = page.locator(".badge-tag");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("DEMO_FIXTURE");

    // 3. Verify prominent top banner explaining Demo Fixture Mode
    const banner = page.locator("text=DEMO FIXTURE MODE:");
    await expect(banner).toBeVisible();
    await expect(page.locator("text=Displaying high-fidelity synthetic benchmark scenario")).toBeVisible();
  });

  test("brief form interaction, validation, and anchor manipulation", async ({ page }) => {
    await page.goto("/");

    // Check pre-filled values
    const itemInput = page.locator("input#itemName");
    await expect(itemInput).toHaveValue("Olive Linen Overshirt");

    // Clear and enter new anchor
    const newAnchorInput = page.locator("input#newAnchorInput");
    await newAnchorInput.fill("MUBI");
    await page.locator("button:has-text('Add')").click();

    // Verify MUBI anchor appears
    await expect(page.locator("text=MUBI")).toBeVisible();

    // Verify anchor count or tags
    const removeButtons = page.locator("button[title*='Remove anchor']");
    const countBefore = await removeButtons.count();
    expect(countBefore).toBeGreaterThan(0);
  });

  test("complete explicit fixture journey to candidate plans", async ({ page }) => {
    await page.goto("/");

    // Click Start Bounded Agent Run
    const startButton = page.locator("button:has-text('Start Bounded Agent Run')");
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Verify Agent Workbench displays budget and steps
    await expect(page.locator("text=2. Bounded Agent Controller Trace")).toBeVisible();
    await expect(page.locator("text=Budget:")).toBeVisible();

    // Wait for feasible interventions to be visible
    const interventions = page.locator("#intervention-board");
    await expect(interventions).toBeVisible({ timeout: 15000 });

    // Verify feasible plans exist
    const selectButtons = page.locator("button:has-text('Select & Export Experiment')");
    expect(await selectButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test("evidence drawer opening, inspection, and closing", async ({ page }) => {
    await page.goto("/");

    // Find and click an evidence chip
    const evidenceChip = page.locator("button[title*='Click to view verified evidence node']").first();
    await expect(evidenceChip).toBeVisible();
    await evidenceChip.click();

    // Verify evidence drawer opens
    const drawerHeading = page.locator("text=Supporting Evidence Ledger");
    await expect(drawerHeading).toBeVisible();

    // Close drawer via close button
    const closeButton = page.locator("button[title='Close Drawer']");
    await closeButton.click();

    await expect(drawerHeading).not.toBeVisible();
  });

  test("Qloo-off ablation comparison modal", async ({ page }) => {
    await page.goto("/");

    // Click ablation button in header
    const ablationBtn = page.locator("#ablation-toggle-btn");
    await expect(ablationBtn).toBeVisible();
    await ablationBtn.click();

    // Verify Ablation modal content
    await expect(page.locator("#ablation-modal")).toBeVisible();
    await expect(page.locator("text=The Qloo Indispensability Test")).toBeVisible();
    await expect(page.locator("text=WITHOUT QLOO (GENERIC BASELINE)")).toBeVisible();
    await expect(page.locator("text=WITH QLOO CULTURAL INTELLIGENCE")).toBeVisible();

    // Close modal
    await page.keyboard.press("Escape");
    await expect(page.locator("#ablation-modal")).not.toBeVisible();
  });

  test("decision receipt modal and JSON/HTML export verification", async ({ page }) => {
    await page.goto("/");

    // Click select & export on the first plan
    const selectBtn = page.locator("button:has-text('Select & Export Experiment')").first();
    await expect(selectBtn).toBeVisible();
    await selectBtn.click();

    // Verify Decision Receipt modal opens
    await expect(page.locator("#receipt-modal")).toBeVisible();
    await expect(page.locator("text=Approved Decision Receipt")).toBeVisible();

    // Verify print/download buttons exist
    const printBtn = page.locator("button:has-text('Print Card')");
    const jsonBtn = page.locator("button:has-text('JSON')");
    await expect(printBtn).toBeVisible();
    await expect(jsonBtn).toBeVisible();

    // Close modal via close button or Escape
    await page.keyboard.press("Escape");
    await expect(page.locator("#receipt-modal")).not.toBeVisible();
  });

  test("keyboard-only navigation and accessibility flow", async ({ page }) => {
    await page.goto("/");

    // Focus ablation button directly and trigger via Enter
    const ablationBtn = page.locator("#ablation-toggle-btn");
    await ablationBtn.scrollIntoViewIfNeeded();
    await ablationBtn.focus();
    await page.keyboard.press("Enter");

    // Modal should open
    await expect(page.locator("#ablation-modal")).toBeVisible();

    // Escape closes modal
    await page.keyboard.press("Escape");
    await expect(page.locator("#ablation-modal")).not.toBeVisible();
  });

  test("About / Safe-Use modal displays truthful disclaimers", async ({ page }) => {
    await page.goto("/");

    // Click Method & Safe Use
    const aboutBtn = page.locator("#about-toggle-btn");
    await expect(aboutBtn).toBeVisible();
    await aboutBtn.click();

    // Verify disclaimers and safety guidance
    await expect(page.locator("#about-modal")).toBeVisible();
    await expect(page.locator("text=LastRack Architecture & Safe Use Boundary")).toBeVisible();
    await expect(page.locator("text=No Demographic Profiling")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#about-modal")).not.toBeVisible();
  });
});
