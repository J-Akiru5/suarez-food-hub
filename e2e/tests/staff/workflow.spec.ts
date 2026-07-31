import { expect, test } from "@playwright/test";

// Staff accounts are created by an admin (no self-registration), so this spec
// uses the seeded staff credential from scripts/seed-users.ts (default seed
// password; if SEED_USER_PASSWORD was overridden, update it here). This is
// test-only — the staff app uses a proxy, not middleware, and neither is touched.
const STAFF_EMAIL = "staff@seed.local";
const STAFF_PASSWORD = "password123";

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter username or email").fill(STAFF_EMAIL);
  await page.getByPlaceholder("Enter your password").fill(STAFF_PASSWORD);
  await page.getByRole("button", { name: /Sign In/ }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15000 });
}

test.describe("staff workflow (1280x720)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("staff login → dashboard renders stats and navigation", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsStaff(page);
    // Dashboard heading + stat tiles render
    await expect(page.getByRole("heading", { name: /Staff Dashboard/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Pending/).first()).toBeVisible();
    await expect(page.getByText(/Preparing/).first()).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("staff orders page renders tabs and refresh", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await loginAsStaff(page);
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: /Orders/ })).toBeVisible({ timeout: 15000 });
    // Tab bar renders (radix tabs)
    await expect(page.getByRole("tab", { name: /Pending/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Preparing/ })).toBeVisible();
    // Refresh button works without errors
    await expect(page.getByRole("button", { name: /Refresh/ })).toBeVisible();
    await page.getByRole("button", { name: /Refresh/ }).click();
    expect(errors).toHaveLength(0);
  });

  test("staff inventory page renders and add-product dialog opens", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsStaff(page);
    await page.goto("/inventory");
    await expect(page.getByRole("heading", { name: /Inventory/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder("Search products...")).toBeVisible();

    // Open the Add Product dialog and confirm it renders (no data written)
    await page.getByRole("button", { name: /Add Product/ }).click();
    const dialog = page
      .getByRole("dialog")
      .filter({ hasText: /Add Product|Edit Product/ })
      .first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Product name")).toBeVisible();
    await expect(page.getByPlaceholder("Product description")).toBeVisible();
    expect(errors).toHaveLength(0);

    // Cancel closes the dialog
    await page
      .getByRole("button", { name: /Cancel/ })
      .first()
      .click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });
});
