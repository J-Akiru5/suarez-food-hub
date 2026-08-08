import { expect, test } from "@playwright/test";

// Each test creates a BRAND-NEW account so tests never collide with each other
// or with previous runs. No middleware/proxy changes — this is test-only.
let counter = 0;
function makeUser() {
  counter += 1;
  const stamp = Date.now().toString().slice(-9);
  const suffix = `${stamp}${counter}${Math.random().toString(36).slice(2, 5)}`;
  return {
    username: `e2e${suffix}`,
    email: `e2e${suffix}@example.com`,
    password: "Testpass123!",
    phone: "09123456789",
    address: "123 Test St, Brgy. San Juan, Iloilo City",
  };
}

async function registerCustomer(page: import("@playwright/test").Page, creds: ReturnType<typeof makeUser>) {
  await page.goto("/register");
  await page.getByRole("button", { name: /I'm a Customer/ }).click();
  await page.locator('label:text-is("First Name") + input').fill("E2E");
  await page.locator('label:text-is("Last Name") + input').fill("Tester");
  await page.locator('label:text-is("Phone Number") + input').fill(creds.phone);
  await page.locator('label:text-is("Username") + input').fill(creds.username);
  await page.locator('label:text-is("Email") + input').fill(creds.email);
  await page.locator('label:text-is("Password") + div input').fill(creds.password);
  await page.locator('label:text-is("Confirm Password") + div input').fill(creds.password);
  await page.getByRole("button", { name: /Create Customer Account/ }).click();
  // Robust: some environments auto-authenticate after signup and route to "/",
  // others route to "/login" — wait for EITHER outcome.
  await page.waitForURL((url) => !url.pathname.startsWith("/register"), { timeout: 20000 });
}

async function loginCustomer(page: import("@playwright/test").Page, creds: ReturnType<typeof makeUser>) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter username or email").fill(creds.username);
  await page.getByPlaceholder("Enter your password").fill(creds.password);
  await page.getByRole("button", { name: /^Login$/ }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15000 });
}

// After registering, we are either already logged in (landed on "/") or must sign in ("/login").
async function ensureLoggedIn(page: import("@playwright/test").Page, creds: ReturnType<typeof makeUser>) {
  if (page.url().includes("/login")) {
    await loginCustomer(page, creds);
  }
}

async function addFirstAvailableProduct(page: import("@playwright/test").Page) {
  await page.goto("/menu");
  // Wait for the product grid to render
  await expect(
    page
      .locator('div[role="button"]')
      .filter({ has: page.locator("h3") })
      .first(),
  ).toBeVisible({
    timeout: 15000,
  });
  // Auth is loaded when the "Sign in to Order" prompt is gone (rendered only when user === null)
  await expect(page.getByText("Sign in to Order")).toHaveCount(0, { timeout: 15000 });
  // Pick the first card that is NOT marked Sold Out
  const card = page
    .locator('div[role="button"]')
    .filter({ has: page.locator("h3") })
    .filter({ hasNot: page.getByText("Sold Out") })
    .first();
  await card.click();
  // Product modal opens
  const modal = page.getByRole("dialog").filter({ hasText: "Add to Basket" }).first();
  await expect(modal).toBeVisible({ timeout: 10000 });
  const addButton = modal.getByRole("button", { name: /Add to Basket/ });
  await expect(addButton).toBeEnabled();
  await addButton.click();
  // Toast confirms
  await expect(page.getByText(/added to basket/)).toBeVisible({ timeout: 10000 });
}

async function completeCheckout(page: import("@playwright/test").Page, creds: ReturnType<typeof makeUser>) {
  // Wait for checkout to settle: fresh accounts see the "Set Up Your Delivery
  // Address" panel (profile has no address), accounts with a saved address see
  // the delivery form directly. Checking too early races the profile fetch.
  const enterHere = page.getByRole("button", { name: /Enter Address Here/ });
  const addressField = page.getByPlaceholder("House #, Street, Barangay, City");
  await expect(addressField.or(enterHere).first()).toBeVisible({ timeout: 15000 });
  if (await enterHere.isVisible().catch(() => false)) {
    await enterHere.click();
    await page.getByPlaceholder("123 Rizal Street").fill("E2E Test Street");
    await page.getByText("Select Town / City").click();
    await page.getByRole("option", { name: "City of Iloilo" }).click();
    await page.getByText("Select Barangay").click();
    await page.getByRole("option", { name: "San Jose" }).first().click();
    await page.getByPlaceholder("5000").fill("5000");
    await page.getByRole("button", { name: /Save Address & Continue/ }).click();
    // Panel closes → the normal delivery form appears with the address pre-filled
    await expect(page.getByPlaceholder("House #, Street, Barangay, City")).toBeVisible({ timeout: 10000 });
  }
  await page.getByPlaceholder("House #, Street, Barangay, City").fill(creds.address);
  await page.getByPlaceholder("09XX XXX XXXX").fill(creds.phone);
  await page.getByRole("button", { name: /Continue to Payment/ }).click();
  await page.getByRole("button", { name: /Confirm Details/ }).click();
  await page.getByRole("button", { name: /Place Order/ }).click();
  await expect(page.getByText("Order Placed!")).toBeVisible({ timeout: 20000 });
}

test.describe("desktop customer journey (1280x720)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("guest clicking a product shows the sign-in modal", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/menu");
    await expect(
      page
        .locator('div[role="button"]')
        .filter({ has: page.locator("h3") })
        .first(),
    ).toBeVisible({
      timeout: 15000,
    });
    await page
      .locator('div[role="button"]')
      .filter({ has: page.locator("h3") })
      .filter({ hasNot: page.getByText("Sold Out") })
      .first()
      .click();
    await expect(page.getByRole("dialog").filter({ hasText: "Sign in to Order" })).toBeVisible({ timeout: 10000 });
    expect(errors).toHaveLength(0);
  });

  test("menu search is typo-tolerant and category filter works", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/menu");
    await expect(
      page
        .locator('div[role="button"]')
        .filter({ has: page.locator("h3") })
        .first(),
    ).toBeVisible({
      timeout: 15000,
    });

    // The menu's fuzzy/typo fallback compares the QUERY against individual name
    // WORDS and only runs for queries <= 8 chars. So pick a product whose name
    // contains a single word <= 8 chars and typo that word — the fuzzy matcher
    // (Levenshtein distance <= threshold) will still surface the product.
    const names = (await page.locator('div[role="button"] h3').allTextContents()).map((n) => n.trim());
    let target: { name: string; word: string } | undefined;
    for (const name of names) {
      const word = name.split(/\s+/).find((w) => w.length >= 2 && w.length <= 8);
      if (word) {
        target = { name, word };
        break;
      }
    }

    if (target) {
      const typo = target.word.slice(0, -1) + (target.word.endsWith("a") ? "o" : "a");
      await page.getByPlaceholder("Search the menu...").fill(typo);
      // The product card (h3 with the full name) should still appear
      await expect(page.getByText(target.name, { exact: true }).first()).toBeVisible({ timeout: 5000 });
      await page.getByPlaceholder("Search the menu...").fill("");
    }

    // Click a category pill and confirm the grid still renders without crashing.
    const categoryPill = page.locator("button", { hasText: /Dumplings|Main Dish|Drinks|Dessert/ }).first();
    const categoryName = ((await categoryPill.textContent()) || "").trim();
    expect(categoryName.length).toBeGreaterThan(0);
    await categoryPill.click();
    // Filtering must not crash the page: either products render or the empty state shows.
    const gridHasProducts =
      (await page
        .locator('div[role="button"]')
        .filter({ has: page.locator("h3") })
        .count()) > 0;
    const emptyState = await page
      .getByText("No items found")
      .isVisible()
      .catch(() => false);
    expect(gridHasProducts || emptyState).toBe(true);
    await expect(page.getByPlaceholder("Search the menu...")).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("full journey: register fresh account → add to cart → checkout → place order", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const creds = makeUser(); // brand-new account every run
    await registerCustomer(page, creds);
    await ensureLoggedIn(page, creds);
    await addFirstAvailableProduct(page);

    // Desktop persistent cart panel shows the item. NOTE: the mobile drawer is
    // always mounted off-screen, so scope to the persistent panel (first in DOM).
    await expect(page.getByRole("link", { name: /Proceed to Checkout/ }).first()).toBeVisible({ timeout: 10000 });

    await page
      .getByRole("link", { name: /Proceed to Checkout/ })
      .first()
      .click();
    await page.waitForURL(/\/checkout/);
    await completeCheckout(page, creds);

    // Click through to orders page and confirm the order is listed as Pending
    await page.getByRole("button", { name: /View Order Status/ }).click();
    await page.waitForURL(/\/orders/);
    await expect(page.getByText("Pending").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /All Orders/ })).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe("rider application", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("rider registers with valid ID upload and submits application", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const creds = makeUser(); // brand-new rider account every run
    await page.goto("/register");
    await page.getByRole("button", { name: /I'm a Rider/ }).click();

    // Personal info + account fields (same layout as customer form)
    await page.locator('label:text-is("First Name") + input').fill("E2E");
    await page.locator('label:text-is("Last Name") + input').fill("Rider");
    await page.locator('label:text-is("Phone Number") + input').fill(creds.phone);
    await page.locator('label:text-is("Username") + input').fill(creds.username);
    await page.locator('label:text-is("Email") + input').fill(creds.email);
    await page.locator('label:text-is("Password") + div input').fill(creds.password);
    await page.locator('label:text-is("Confirm Password") + div input').fill(creds.password);

    // Vehicle + ID details
    await page.locator('label:text-is("Vehicle Type") + select').selectOption("motorcycle");
    await page.locator('label:text-is("Plate Number") + input').fill("XYZ-123");
    await page.locator('label:text-is("License Number") + input').fill("LIC-98765");

    // Upload a valid government ID image (hidden file input).
    // NOTE: this requires the Supabase "images" storage bucket to exist and be
    // writable — the register page uploads valid_id images there.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "valid-id.png",
      mimeType: "image/png",
      buffer: png,
    });
    // Upload completes when the button flips to "Change ID"
    await expect(page.getByRole("button", { name: /Change ID/ })).toBeVisible({ timeout: 15000 });

    // Submit the rider application
    await page.getByRole("button", { name: /Submit Rider Application/ }).click();
    await expect(page.getByText("Application Submitted!")).toBeVisible({ timeout: 15000 });
    // Dismiss the SweetAlert, then app routes back home
    await page.locator(".swal2-confirm").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/register"), { timeout: 15000 });
    expect(errors).toHaveLength(0);
  });
});

test.describe("mobile customer journey (390x844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile: bottom cart bar shows View Basket and checkout works", async ({ page }) => {
    const creds = makeUser(); // another brand-new account, no collision with desktop test
    await registerCustomer(page, creds);
    await ensureLoggedIn(page, creds);
    await addFirstAvailableProduct(page);

    // Mobile bottom bar with View Basket
    const viewBasket = page.getByRole("button", { name: /View Basket/ });
    await expect(viewBasket).toBeVisible({ timeout: 10000 });
    await viewBasket.click();

    // Cart slide-over opens with checkout CTA. Below lg the persistent panel is
    // display:none (excluded from role queries), so only the drawer link matches.
    const drawerCheckout = page.getByRole("link", { name: /Proceed to Checkout/ }).first();
    await expect(drawerCheckout).toBeVisible({ timeout: 10000 });
    await drawerCheckout.click();
    await page.waitForURL(/\/checkout/);

    // Complete checkout on mobile
    await completeCheckout(page, creds);
  });
});
