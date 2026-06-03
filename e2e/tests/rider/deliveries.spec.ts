import { expect, test } from "@playwright/test";

test("rider deliveries redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/deliveries");
  await expect(page).toHaveURL(/\/login/);
});

test("rider earnings redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/earnings");
  await expect(page).toHaveURL(/\/login/);
});

test("rider profile redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
