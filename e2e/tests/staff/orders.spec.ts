import { expect, test } from "@playwright/test";

test("staff dashboard redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("staff inventory redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/login/);
});
