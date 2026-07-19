import { expect, test } from "@playwright/test";

test("admin login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="text"]').first()).toBeVisible();
});

test("admin dashboard redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
