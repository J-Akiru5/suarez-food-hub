import { expect, test } from "@playwright/test";

test("admin login page has expected elements", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('button[type="submit"], button:has-text("Login")').first()).toBeVisible();
});
