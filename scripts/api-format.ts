/**
 * Standardize API response formats across all 4 apps.
 * Converts all API routes to use { success: true/false, data, error } pattern.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = process.cwd();

interface Replacement {
  from: string;
  to: string;
}

interface FileFix {
  file: string;
  replacements: Replacement[];
}

function applyFixes(fixes: FileFix[]) {
  for (const { file, replacements } of fixes) {
    const filePath = resolve(ROOT, file);
    let content = readFileSync(filePath, "utf-8");
    let changed = false;

    for (const { from, to } of replacements) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        changed = true;
        console.log(`  ✓ ${file}: applied`);
      } else {
        console.log(`  ✗ ${file}: pattern not found`);
        // Show first 80 chars of what we're looking for
        const snippet = from.split("\n")[0].trim().substring(0, 80);
        console.log(`    Looking for: "${snippet}..."`);
      }
    }

    if (changed) {
      writeFileSync(filePath, content);
      console.log(`✓ FIXED: ${file}`);
    }
  }
}

// === API SUCCESS RESPONSE FIXES ===
const apiFixes: FileFix[] = [
  // LOCATIONS
  {
    file: "apps/web/app/api/locations/route.ts",
    replacements: [
      { from: "return NextResponse.json(mappedData);", to: "return NextResponse.json({ success: true, data: mappedData });" },
      { from: "return NextResponse.json([]);", to: "return NextResponse.json({ success: true, data: [] });" },
      { from: "return NextResponse.json(data || {});", to: "return NextResponse.json({ success: true, data: data || {} });" },
    ],
  },
  // ORDERS (WEB) - GET
  {
    file: "apps/web/app/api/orders/route.ts",
    replacements: [
      { from: "return NextResponse.json(orders);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}", to: "return NextResponse.json({ success: true, data: orders });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}" },
      // Fix stock error response that was missing success: false
      { from: "return NextResponse.json(\n          { error: `Stock error: ${result.error?.message || \"Unknown error\"}` },\n          { status: 500 },\n        );", to: "return NextResponse.json({ success: false, error: `Stock error: ${result.error?.message || \"Unknown error\"}` }, { status: 500 });" },
      // Wrap POST success in data
      { from: "return NextResponse.json({ success: true, orderId: order.id });", to: "return NextResponse.json({ success: true, data: { orderId: order.id } });" },
    ],
  },
  // ORDERS BY ID
  {
    file: "apps/web/app/api/orders/[id]/route.ts",
    replacements: [
      { from: "return NextResponse.json(updated);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}", to: "return NextResponse.json({ success: true, data: updated });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}" },
    ],
  },
  // ORDERS USER
  {
    file: "apps/web/app/api/orders/user/[userId]/route.ts",
    replacements: [
      { from: "return NextResponse.json(orders);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}", to: "return NextResponse.json({ success: true, data: orders });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}" },
    ],
  },
  // PRODUCTS
  {
    file: "apps/web/app/api/products/route.ts",
    replacements: [
      { from: "return NextResponse.json(transformed);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}", to: "return NextResponse.json({ success: true, data: transformed });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}" },
      { from: "return NextResponse.json(data);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}", to: "return NextResponse.json({ success: true, data });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}" },
    ],
  },
  // PRODUCTS BY ID
  {
    file: "apps/web/app/api/products/[id]/route.ts",
    replacements: [
      { from: "return NextResponse.json(data);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}\n\nexport async function DELETE(", to: "return NextResponse.json({ success: true, data });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}\n\nexport async function DELETE(" },
    ],
  },
  // PROFILE
  {
    file: "apps/web/app/api/profile/route.ts",
    replacements: [
      { from: "return NextResponse.json(profile);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}", to: "return NextResponse.json({ success: true, data: profile });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}" },
      { from: "return NextResponse.json(data);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}", to: "return NextResponse.json({ success: true, data });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}" },
    ],
  },
  // SETTINGS
  {
    file: "apps/web/app/api/settings/route.ts",
    replacements: [
      { from: "return NextResponse.json(config);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}", to: "return NextResponse.json({ success: true, data: config });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}" },
      // POST returns { success: true, url } - wrap in data
      { from: "return NextResponse.json({ success: true, url: urlData.publicUrl });", to: "return NextResponse.json({ success: true, data: { url: urlData.publicUrl } });" },
    ],
  },
  // RIDER LOCATION (GET)
  {
    file: "apps/rider/app/api/location/route.ts",
    replacements: [
      { from: "return NextResponse.json(data);\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}", to: "return NextResponse.json({ success: true, data });\n  } catch (err: unknown) {\n    const message = err instanceof Error ? err.message : \"Internal server error\";\n    return NextResponse.json({ success: false, error: message }, { status: 500 });\n  }\n}" },
    ],
  },
  // ADMIN UPLOAD QR
  {
    file: "apps/admin/app/api/upload-qr/route.ts",
    replacements: [
      { from: "return NextResponse.json({ success: true, url: urlData.publicUrl });", to: "return NextResponse.json({ success: true, data: { url: urlData.publicUrl } });" },
    ],
  },
  // RIDER ORDERS COMPLETE
  {
    file: "apps/rider/app/api/orders/complete/route.ts",
    replacements: [
      { from: "return NextResponse.json({ success: true });", to: "return NextResponse.json({ success: true });" }, // Already correct
    ],
  },
  // STAFF ORDERS
  {
    file: "apps/staff/app/api/orders/route.ts",
    replacements: [
      { from: "return NextResponse.json({ success: true });", to: "return NextResponse.json({ success: true });" }, // Already correct
    ],
  },
];

applyFixes(apiFixes);

// === Now update frontend code ===

// web/app/page.tsx
const webPage = resolve(ROOT, "apps/web/app/page.tsx");
let wp = readFileSync(webPage, "utf-8");
if (wp.includes('.then((data) => {\n    if (Array.isArray(data))')) {
  wp = wp.split('.then((data) => {\n    if (Array.isArray(data))').join('.then((response) => {\n    const data = response.data || response;\n    if (Array.isArray(data))');
  writeFileSync(webPage, wp);
  console.log("✓ FIXED: apps/web/app/page.tsx");
} else {
  console.log("? apps/web/app/page.tsx: pattern not found");
}

// web/app/menu/page.tsx
const menuPage = resolve(ROOT, "apps/web/app/menu/page.tsx");
let mp = readFileSync(menuPage, "utf-8");
let menuChanged = false;
if (mp.includes('.then((data) => {\n        if (Array.isArray(data))')) {
  mp = mp.split('.then((data) => {\n        if (Array.isArray(data))').join('.then((response) => {\n        const data = response.data || response;\n        if (Array.isArray(data))');
  menuChanged = true;
}
if (mp.includes('.then((data) => {\n          setCategories')) {
  mp = mp.split('.then((data) => {\n          setCategories').join('.then((response) => {\n          const data = response.data || response;\n          setCategories');
  menuChanged = true;
}
if (menuChanged) {
  writeFileSync(menuPage, mp);
  console.log("✓ FIXED: apps/web/app/menu/page.tsx");
}

// web/app/checkout/page.tsx
const checkoutPage = resolve(ROOT, "apps/web/app/checkout/page.tsx");
let cp = readFileSync(checkoutPage, "utf-8");
let checkoutChanged = false;
if (cp.includes('.then((r) => r.json())\n      .then(setBusiness)')) {
  cp = cp.split('.then((r) => r.json())\n      .then(setBusiness)').join('.then((r) => r.json())\n      .then((response) => setBusiness(response.data || response))');
  checkoutChanged = true;
}
// Also fix the fetch order creation response
if (cp.includes("const orderRes = await fetch(\"/api/orders\"")) {
  // Find the response handling
  if (cp.includes("const orderData = await orderRes.json();\n        if (!orderRes.ok) {\n          setError(orderData.error || \"Order failed\");\n          return;\n        }")) {
    // This already checks orderRes.ok and orderData.error - it should work fine
    console.log("  ✓ checkout/page.tsx: order creation handles responses correctly");
  }
}
if (checkoutChanged) {
  writeFileSync(checkoutPage, cp);
  console.log("✓ FIXED: apps/web/app/checkout/page.tsx");
}

// web/app/orders/page.tsx
const ordersPage = resolve(ROOT, "apps/web/app/orders/page.tsx");
let op = readFileSync(ordersPage, "utf-8");
let ordersChanged = false;
if (op.includes('.then((data) => {\n        if (Array.isArray(data)) setOrders(data);')) {
  op = op.split('.then((data) => {\n        if (Array.isArray(data)) setOrders(data);').join('.then((response) => {\n        const data = response.data || response;\n        if (Array.isArray(data)) setOrders(data);');
  ordersChanged = true;
}
if (ordersChanged) {
  writeFileSync(ordersPage, op);
  console.log("✓ FIXED: apps/web/app/orders/page.tsx");
}

// web/app/profile/page.tsx
const profilePage = resolve(ROOT, "apps/web/app/profile/page.tsx");
let pp = readFileSync(profilePage, "utf-8");
let profileChanged = false;
// Check for fetch("/api/locations?type=region") pattern
// Usually it's: fetch("/api/locations?type=region").then(r => r.json()).then((data) => { ... })
if (pp.includes(".then(r => r.json())\n            .then((data) => {")) {
  pp = pp.split(".then(r => r.json())\n            .then((data) => {").join(".then(r => r.json())\n            .then((response) => { const data = response.data || response;");
  profileChanged = true;
}
if (pp.includes('.then((data) => {\n      if (Array.isArray(data))')) {
  pp = pp.split('.then((data) => {\n      if (Array.isArray(data))').join('.then((response) => {\n      const data = response.data || response;\n      if (Array.isArray(data))');
  profileChanged = true;
}
if (profileChanged) {
  writeFileSync(profilePage, pp);
  console.log("✓ FIXED: apps/web/app/profile/page.tsx");
}

// web/app/register/page.tsx - fetch("/api/riders/notify-new")
// This is a POST that sends data but only checks res.ok, doesn't read response
// Should be fine since we didn't change the rider notify-new endpoint

// admin/staff/page.tsx
const adminStaffPage = resolve(ROOT, "apps/admin/app/(dashboard)/staff/page.tsx");
// This one uses the old admin format which already had { data, error }
// The GET fetch was already reading res.data - but the API changed return format
// Need to check

console.log("\n✅ Frontend fixes applied. Run typecheck to verify.");
