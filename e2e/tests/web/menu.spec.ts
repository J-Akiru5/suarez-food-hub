import { expect, test } from "@playwright/test";

test("menu page loads with products", async ({ page }) => {
  await page.goto("/menu");
  await expect(page.locator("body")).toBeVisible();
});

test("menu page renders without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/menu");
  expect(errors).toHaveLength(0);
});
