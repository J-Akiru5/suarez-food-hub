import { expect, test } from "@playwright/test";

test("rider login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="text"]').first()).toBeVisible();
});

test("rider home redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
