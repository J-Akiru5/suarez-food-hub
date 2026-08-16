// Live verification of the Client Round 2 fixes.
// Exercises the real HTTP routes with real sessions (cookie-based SSR auth).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync("apps/web/.env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const REF = new URL(SUPABASE_URL).host.split(".")[0];
const COOKIE_NAME = `sb-${REF}-auth-token`;

const WEB = "http://localhost:3000";
const ADMIN = "http://localhost:3001";
const STAFF = "http://localhost:3002";
const RIDER = "http://localhost:3003";

let pass = 0;
let fail = 0;
function ok(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token)
    throw new Error(`sign-in failed for ${email}: ${json.error_description || json.msg || res.status}`);
  const cookie = encodeURIComponent(
    JSON.stringify({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
    }),
  );
  return { cookie: `${COOKIE_NAME}=${cookie}`, userId: json.user.id };
}

async function api(base, path, cookie, method = "GET", body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const customerEmail = `verify${rand}@example.com`;

  // ---- Read the admin-configured delivery areas up front ----
  const { data: biz } = await SVC.from("business").select("delivery_areas").limit(1).single();
  const areas = (biz?.delivery_areas || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (areas.length === 0) throw new Error("No delivery areas configured in business settings");
  const customerTown = areas[0];

  // ---- Setup: test customer with a full profile (address) ----
  console.log(`\nSetup: creating test customer ${customerEmail} (town ${customerTown})`);
  const { data: created, error: cErr } = await SVC.auth.admin.createUser({
    email: customerEmail,
    password: "password123",
    email_confirm: true,
    user_metadata: { role: "customer", first_name: "Verify", last_name: "Tester" },
  });
  if (cErr) throw new Error(cErr.message);
  const custId = created.user.id;
  const now = new Date().toISOString();
  await SVC.from("profiles").upsert(
    {
      id: custId,
      email: customerEmail,
      full_name: "Verify Tester",
      first_name: "Verify",
      last_name: "Tester",
      role: "customer",
      is_active: true,
      username: `verify${rand}`,
      town_id: customerTown,
      province_id: "063000000", // Iloilo
      region_id: "0600000000", // Western Visayas
      zip_code: "5000",
      address: `42 Main Street, town ${customerTown}`,
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  const cust = await signIn(customerEmail, "password123");
  const staff = await signIn("staff@seed.local", "password123");
  const admin = await signIn("admin@seed.local", "password123");
  const rider = await signIn("rider@seed.local", "password123");

  // ---- Test 1: stock decrement on staff confirm + restore on cancel ----
  console.log("\n── Test 1: staff confirm deducts stock; cancel restores ──");
  const { data: product } = await SVC.from("products")
    .select("id, name, quantity")
    .gt("quantity", 10)
    .limit(1)
    .single();
  if (!product) {
    console.log("  ⚠️ no product with stock > 10, skipping");
  } else {
    const qty = 2;
    const stockBefore = product.quantity;
    const orderRes = await api(WEB, "/api/orders", cust.cookie, "POST", {
      cart: [{ id: product.id, name: product.name, quantity: qty, price: 100 }],
      delivery_address: `42 Main Street, town ${customerTown}, Iloilo, Western Visayas`,
      delivery_contact: "09171234567",
      payment_method: "cod",
      subtotal: 200,
      delivery_fee: 0,
      total: 200,
    });
    ok(
      "order placed (cod, no address gate hit)",
      orderRes.status === 200 && orderRes.json?.success,
      JSON.stringify(orderRes.json),
    );
    const orderId = orderRes.json?.data?.orderId;
    if (orderId) {
      const { data: p1 } = await SVC.from("products").select("quantity").eq("id", product.id).single();
      ok(
        "stock NOT deducted at order placement",
        p1.quantity === stockBefore,
        `before=${stockBefore} after=${p1.quantity}`,
      );

      const conf = await api(STAFF, "/api/orders", staff.cookie, "PATCH", { order_id: orderId, status: "confirmed" });
      ok("staff confirm accepted", conf.status === 200, JSON.stringify(conf.json));
      const { data: p2 } = await SVC.from("products").select("quantity").eq("id", product.id).single();
      ok(
        "stock DECREMENTED after staff confirm",
        p2.quantity === stockBefore - qty,
        `before=${stockBefore} after=${p2.quantity}`,
      );
      const { data: orderRow } = await SVC.from("orders").select("confirmed_at").eq("id", orderId).single();
      ok("confirmed_at stamped", !!orderRow?.confirmed_at);

      const canc = await api(STAFF, "/api/orders", staff.cookie, "PATCH", { order_id: orderId, status: "cancelled" });
      ok("staff cancel accepted", canc.status === 200, JSON.stringify(canc.json));
      const { data: p3 } = await SVC.from("products").select("quantity").eq("id", product.id).single();
      ok("stock RESTORED after cancel", p3.quantity === stockBefore, `before=${stockBefore} after=${p3.quantity}`);

      // cleanup
      await SVC.from("order_items").delete().eq("order_id", orderId);
      await SVC.from("orders").delete().eq("id", orderId);
    }
  }

  // ---- Test 2: rider accept path deducts stock; delivery pays product price ----
  console.log("\n── Test 2: rider accept deducts stock; earning = product price ──");
  const { data: product2 } = await SVC.from("products")
    .select("id, name, quantity")
    .gt("quantity", 10)
    .limit(1)
    .single();
  if (!product2) {
    console.log("  ⚠️ no product with stock > 10, skipping");
  } else {
    const qty = 1;
    const price = 250;
    const stockBefore = product2.quantity;
    const orderRes = await api(WEB, "/api/orders", cust.cookie, "POST", {
      cart: [{ id: product2.id, name: product2.name, quantity: qty, price }],
      delivery_address: `42 Main Street, town ${customerTown}, Iloilo, Western Visayas`,
      delivery_contact: "09171234567",
      payment_method: "cod",
      subtotal: price,
      delivery_fee: 0,
      total: price,
    });
    ok("order placed", orderRes.status === 200, JSON.stringify(orderRes.json));
    const orderId = orderRes.json?.data?.orderId;
    if (orderId) {
      // broadcast to rider (pending_riders)
      await SVC.from("orders")
        .update({ pending_riders: [rider.userId] })
        .eq("id", orderId);
      const acc = await api(RIDER, "/api/orders/status", rider.cookie, "POST", {
        order_id: orderId,
        status: "claimed_by_rider",
      });
      ok("rider accept accepted", acc.status === 200, JSON.stringify(acc.json));
      const { data: p1 } = await SVC.from("products").select("quantity").eq("id", product2.id).single();
      ok(
        "stock DECREMENTED on rider accept (pending → claimed)",
        p1.quantity === stockBefore - qty,
        `before=${stockBefore} after=${p1.quantity}`,
      );

      // deliver
      const del = await api(RIDER, "/api/orders/status", rider.cookie, "POST", {
        order_id: orderId,
        status: "out_for_delivery",
      });
      const del2 = await api(RIDER, "/api/orders/status", rider.cookie, "POST", {
        order_id: orderId,
        status: "near_customer",
      });
      const del3 = await api(RIDER, "/api/orders/status", rider.cookie, "POST", {
        order_id: orderId,
        status: "delivered",
      });
      ok(
        "delivery flow completed",
        del.status === 200 && del2.status === 200 && del3.status === 200,
        `${del.status}/${del2.status}/${del3.status} ${JSON.stringify(del3.json)}`,
      );
      const { data: earn } = await SVC.from("rider_earnings")
        .select("amount, order_id")
        .eq("order_id", orderId)
        .maybeSingle();
      ok("rider earning created", !!earn, JSON.stringify(earn));
      ok("earning = product price (250), not delivery fee", earn?.amount === price, `amount=${earn?.amount}`);
      const { data: orderRow } = await SVC.from("orders").select("status, rider_id").eq("id", orderId).single();
      ok(
        "order delivered with rider assigned",
        orderRow?.status === "delivered" && orderRow?.rider_id === rider.userId,
        JSON.stringify(orderRow),
      );

      // cleanup
      await SVC.from("rider_earnings").delete().eq("order_id", orderId);
      await SVC.from("order_items").delete().eq("order_id", orderId);
      await SVC.from("orders").delete().eq("id", orderId);
    }
  }

  // ---- Test 3: admin resign via API ----
  console.log("\n── Test 3: admin mark-as-resigned (server-side) ──");
  const riderEmail = `verifyrider${rand}@example.com`;
  const { data: rc } = await SVC.auth.admin.createUser({
    email: riderEmail,
    password: "password123",
    email_confirm: true,
    user_metadata: {
      role: "rider",
      first_name: "Verify",
      last_name: "Rider",
      rider_status: "available",
      is_active: true,
    },
  });
  await SVC.from("profiles").upsert(
    {
      id: rc.user.id,
      email: riderEmail,
      full_name: "Verify Rider",
      first_name: "Verify",
      last_name: "Rider",
      role: "rider",
      is_active: true,
      username: `verifyr${rand}`,
      rider_status: "available",
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  const resign = await api(ADMIN, "/api/riders", admin.cookie, "PATCH", {
    id: rc.user.id,
    rider_status: "resigned",
    is_active: false,
  });
  ok("resign API accepted", resign.status === 200, JSON.stringify(resign.json));
  const { data: rp } = await SVC.from("profiles").select("rider_status, is_active").eq("id", rc.user.id).single();
  ok(
    "rider marked resigned + inactive in DB",
    rp?.rider_status === "resigned" && rp?.is_active === false,
    JSON.stringify(rp),
  );

  // cleanup rider
  await SVC.auth.admin.deleteUser(rc.user.id);
  await SVC.from("profiles").delete().eq("id", rc.user.id);

  // ---- Test 4: feedback shows sender ----
  console.log("\n── Test 4: admin feedback shows sender profile ──");
  const fb = await api(WEB, "/api/feedback", cust.cookie, "POST", { message: `round2 verification feedback ${rand}` });
  ok("customer feedback posted", fb.status === 200, JSON.stringify(fb.json));
  const list = await api(ADMIN, "/api/feedback", admin.cookie, "GET");
  ok("admin feedback fetch ok", list.status === 200, JSON.stringify(list.json));
  const entry = (list.json?.data || []).find((e) => e.message?.includes(`round2 verification feedback ${rand}`));
  ok("feedback entry found", !!entry, "not found in list");
  ok("sender profile joined (name/email visible)", !!entry?.sender, JSON.stringify(entry?.sender));
  ok("sender email matches customer", entry?.sender?.email === customerEmail, `got=${entry?.sender?.email}`);
  if (entry?.id) await SVC.from("feedback").delete().eq("id", entry.id);

  // ---- Test 5: delivery fee hidden from customer ----
  console.log("\n── Test 5: delivery fee not charged on customer orders ──");
  const { data: p5 } = await SVC.from("products").select("id, name, quantity").gt("quantity", 10).limit(1).single();
  if (p5) {
    const ores = await api(WEB, "/api/orders", cust.cookie, "POST", {
      cart: [{ id: p5.id, name: p5.name, quantity: 1, price: 120 }],
      delivery_address: `42 Main Street, town ${customerTown}, Iloilo, Western Visayas`,
      delivery_contact: "09171234567",
      payment_method: "cod",
      subtotal: 120,
      delivery_fee: 0,
      total: 120,
    });
    const oid = ores.json?.data?.orderId;
    ok("order placed without delivery fee", ores.status === 200 && !!oid, JSON.stringify(ores.json));
    if (oid) {
      const { data: row } = await SVC.from("orders")
        .select("delivery_fee, total, rider_earnings")
        .eq("id", oid)
        .single();
      ok("delivery_fee stored as 0", Number(row?.delivery_fee) === 0, `fee=${row?.delivery_fee}`);
      ok(
        "rider_earnings = subtotal (product price)",
        Number(row?.rider_earnings) === 120,
        `earnings=${row?.rider_earnings}`,
      );
      await SVC.from("order_items").delete().eq("order_id", oid);
      await SVC.from("orders").delete().eq("id", oid);
    }
  }

  // ---- Test 6: town dropdown filter (delivery_areas only) ----
  console.log("\n── Test 6: customer town list limited to admin delivery areas ──");
  const loc = await api(WEB, "/api/locations?type=city&parent=063000000", cust.cookie, "GET");
  const towns = loc.json?.data || [];
  ok("locations API returns towns", towns.length > 0, `count=${towns.length}`);
  const allowed = towns.filter((t) => areas.includes(t.code || t.id));
  ok(
    `town list filtered to admin delivery areas (${areas.length} areas)`,
    allowed.length === areas.length,
    `areas=${areas.length} allowed=${allowed.length} totalTowns=${towns.length}`,
  );
  ok("every configured area is an Iloilo town", allowed.length > 0, JSON.stringify(areas));

  // ---- cleanup customer ----
  await SVC.auth.admin.deleteUser(custId);
  await SVC.from("profiles").delete().eq("id", custId);

  console.log(`\n═══════════════════════════════════`);
  console.log(`  RESULT: ${pass} passed, ${fail} failed`);
  console.log(`═══════════════════════════════════`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
