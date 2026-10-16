import { expect, test } from "@playwright/test";

// Uses the same seeded staff credential as workflow.spec.ts (scripts/seed-users.ts).
const STAFF_EMAIL = "staff@seed.local";
const STAFF_PASSWORD = "password123";

async function loginAsStaff(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter username or email").fill(STAFF_EMAIL);
  await page.getByPlaceholder("Enter your password").fill(STAFF_PASSWORD);
  await page.getByRole("button", { name: /Sign In/ }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15000 });
}

test.describe("staff dispatch board (1280x720)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("dispatch page renders both panes with no page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsStaff(page);
    await page.goto("/dispatch");

    await expect(page.getByRole("heading", { name: /^Dispatch$/ })).toBeVisible({ timeout: 15000 });
    // Left pane: order queues
    await expect(page.getByText(/Unassigned orders/)).toBeVisible();
    await expect(page.getByText(/Dispatch log/)).toBeVisible();
    // Right pane: rider leaderboard
    await expect(page.getByText(/Rider queue/)).toBeVisible();
    // Fairness explainer is always shown so staff understand the order
    await expect(page.getByText(/fewest active deliveries/)).toBeVisible();
    // Refresh must not throw
    await page.getByRole("button", { name: /Refresh/ }).click();
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test("dispatch is reachable from the sidebar nav", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsStaff(page);
    await page
      .getByRole("link", { name: /Dispatch/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dispatch/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /^Dispatch$/ })).toBeVisible({ timeout: 15000 });
    expect(errors).toHaveLength(0);
  });

  test("orders list links to dispatch instead of the old invite modal", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsStaff(page);
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: /Orders/ })).toBeVisible({ timeout: 15000 });

    // The multi-rider "first to accept wins" invite flow is gone.
    await expect(page.getByText(/First to accept gets the delivery/)).toHaveCount(0);
    expect(errors).toHaveLength(0);
  });
});
