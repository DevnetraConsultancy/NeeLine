import { test as setup, expect } from "@playwright/test";

// One guest sign-in shared by all tests (guest sign-in is rate limited per IP).
setup("sign in as guest", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: "tests/e2e/.auth/guest.json" });
});
