import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(summary).toEqual([]);
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("neeline_theme", t), theme);
    });

    test("landing page", async ({ browser }) => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await context.newPage();
      await page.addInitScript((t) => localStorage.setItem("neeline_theme", t), theme);
      if (process.env.E2E_VERCEL_SHARE) await page.goto(`/?_vercel_share=${process.env.E2E_VERCEL_SHARE}`);
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoViolations(page);
      await context.close();
    });

    test("dashboard", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Your timelines" })).toBeVisible();
      await expect(page.getByRole("status", { name: /Loading/ })).toHaveCount(0);
      await expectNoViolations(page);
    });

    test("studio and event form", async ({ page }) => {
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "New timeline" }).first().click();
      await page.getByRole("dialog", { name: "New timeline" }).getByLabel("Name").fill(`A11y ${theme}`);
      await page.getByRole("button", { name: "Create timeline" }).click();
      await expect(page.getByRole("button", { name: /^Year Zero/ })).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole("button", { name: /Add event/ }).click();
      await expect(page.getByRole("dialog", { name: "Add milestone" })).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
