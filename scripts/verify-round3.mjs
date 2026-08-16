// Live verification of the Client Round 3 items:
//   - GCash payment proof: customer uploads screenshot, admin/staff can view it
//   - Rider cashout: request-cashout insert works (profile GCash, no errors)
// Creates a real GCash order + proof and keeps it so the admin UI can be
// checked in the preview. Prints credentials; cleanup is a separate step.

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

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`sign-in failed for ${email}: ${json.error_description || res.status}`);
  const cookie = encodeURIComponent(
    JSON.stringify({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
    }),
  );
  return { cookie: `${COOKIE_NAME}=${cookie}`, token: json.access_token, userId: json.user.id };
}

async function api(base, path, cookie, method = "GET", body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
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

  // 1. Read configured delivery areas (first one is the test town)
  const { data: biz } = await SVC.from("business").select("delivery_areas").limit(1).single();
  const areas = (biz?.delivery_areas || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const customerTown = areas[0];

  // 2. Test customer
  const customerEmail = `verify3${rand}@example.com`;
  const { data: created, error: cErr } = await SVC.auth.admin.createUser({
    email: customerEmail,
    password: "password123",
    email_confirm: true,
    user_metadata: { role: "customer", first_name: "Proof", last_name: "Tester" },
  });
  if (cErr) throw new Error(cErr.message);
  const custId = created.user.id;
  const now = new Date().toISOString();
  await SVC.from("profiles").upsert(
    {
      id: custId,
      email: customerEmail,
      full_name: "Proof Tester",
      first_name: "Proof",
      last_name: "Tester",
      role: "customer",
      is_active: true,
      username: `verify3${rand}`,
      town_id: customerTown,
      province_id: "063000000",
      region_id: "0600000000",
      zip_code: "5000",
      address: `42 Main Street, town ${customerTown}`,
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );
  const cust = await signIn(customerEmail, "password123");

  // 3. Upload a GCash proof screenshot (tiny PNG)
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "gcash-proof.png");
  const upRes = await fetch(`${WEB}/api/upload-proof`, {
    method: "POST",
    headers: { Cookie: cust.cookie },
    body: form,
  });
  const upJson = await upRes.json();
  console.log(`\nProof upload → ${upRes.status} ${JSON.stringify(upJson)}`);
  if (upRes.status !== 200) throw new Error(`proof upload failed: ${JSON.stringify(upJson)}`);
  const proofUrl = upJson.data?.url;
  const refNo = `GC-${Date.now().toString().slice(-8)}`;

  // 4. Place a GCash order with ref no + proof
  const { data: product } = await SVC.from("products")
    .select("id, name, quantity")
    .gt("quantity", 10)
    .limit(1)
    .single();
  const price = 180;
  const orderRes = await api(WEB, "/api/orders", cust.cookie, "POST", {
    cart: [{ id: product.id, name: product.name, quantity: 1, price }],
    delivery_address: `42 Main Street, town ${customerTown}, Iloilo, Western Visayas`,
    delivery_contact: "09171234567",
    payment_method: "gcash",
    gcash_reference: refNo,
    payment_proof_url: proofUrl,
    subtotal: price,
    delivery_fee: 0,
    total: price,
  });
  console.log(`GCash order → ${orderRes.status} ${JSON.stringify(orderRes.json)}`);
  if (orderRes.status !== 200) throw new Error(`order failed: ${JSON.stringify(orderRes.json)}`);
  const orderId = orderRes.json?.data?.orderId;
  const { data: row } = await SVC.from("orders")
    .select("payment_method, gcash_reference_no, payment_proof_url")
    .eq("id", orderId)
    .single();
  console.log(`\nOrder stored: ref=${row?.gcash_reference_no} proof=${row?.payment_proof_url ? "yes" : "MISSING"}`);

  // 5. Rider cashout insert — exact payload the rider earnings page sends
  const rider = await signIn("rider@seed.local", "password123");
  const riderClient = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${rider.token}` } },
  });
  const { data: riderProfile } = await riderClient
    .from("profiles")
    .select("gcash_number")
    .eq("id", rider.userId)
    .maybeSingle();
  console.log(`Rider profile gcash_number: ${riderProfile?.gcash_number || "(empty)"}`);
  const { error: insErr } = await riderClient.from("rider_cashouts").insert({
    id: crypto.randomUUID(),
    rider_id: rider.userId,
    amount: 50,
    gcash_number: riderProfile?.gcash_number || "09170000000",
    status: "requested",
  });
  console.log(`Cashout insert (RLS, exact page payload) → ${insErr ? `❌ ${insErr.message}` : "✅ ok"}`);
  if (!insErr) {
    await SVC.from("rider_cashouts").delete().eq("rider_id", rider.userId).is("notes", null).gte("requested_at", now);
  }

  console.log(`\n═══════════════════════════════════`);
  console.log(`KEEPING GCash order ${orderId} for admin preview check`);
  console.log(`Admin login: admin@seed.local / password123`);
  console.log(`Order URL: http://localhost:3001/orders/${orderId}`);
  console.log(`Cleanup: node scripts/cleanup-round3.mjs ${orderId}`);
  console.log(`═══════════════════════════════════`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
