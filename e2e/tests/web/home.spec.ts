import { expect, test } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toHaveLength(0);
});

test("menu link navigates to menu page", async ({ page }) => {
  await page.goto("/");
  const menuLink = page.locator('a[href="/menu"]').first();
  if (await menuLink.isVisible()) {
    await menuLink.click();
    await expect(page).toHaveURL(/\/menu/);
  }
});
