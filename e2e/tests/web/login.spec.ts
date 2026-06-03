import { expect, test } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
});

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
