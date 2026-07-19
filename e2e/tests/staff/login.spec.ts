import { expect, test } from "@playwright/test";

test("staff login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="text"]').first()).toBeVisible();
});

test("staff orders redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);
});
