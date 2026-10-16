// Live verification of the staff Dispatch board (migration 0030).
//
// Exercises the real HTTP routes with real sessions, end to end:
//   1. staff assigns a rider        -> order becomes awaiting_rider
//   2. rider accepts                -> claimed_by_rider (+ dispatch_log accepted)
//   3. rider declines               -> cascades to the next eligible rider
//   4. cascade exhausts             -> order returns to ready_for_pickup + staff paged
//   5. staff revokes                -> rider detached, order back in the queue
//   6. concurrency cap              -> assign_rider refuses an over-cap rider
//   7. stale assignment             -> requeue_stale_assignments() re-cascades
//
// Requires: migration 0030 applied in the Supabase SQL editor, and the four
// dev servers running (pnpm dev) — same prerequisites as verify-round2.
//
//   node scripts/verify-dispatch.mjs

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

const STAFF = "http://localhost:3002";
const RIDER = "http://localhost:3003";

let pass = 0;
let fail = 0;
function ok(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
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
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

function getOrder(id) {
  return SVC.from("orders")
    .select("status, rider_id, rider_assigned_at, dispatch_prev_status, pending_riders")
    .eq("id", id)
    .single();
}

async function cleanup({ orderIds = [], riderIds = [], userIds = [] } = {}) {
  for (const orderId of orderIds) {
    await SVC.from("dispatch_log").delete().eq("order_id", orderId);
    await SVC.from("order_status_log").delete().eq("order_id", orderId);
    await SVC.from("order_items").delete().eq("order_id", orderId);
    await SVC.from("rider_earnings").delete().eq("order_id", orderId);
    await SVC.from("orders").delete().eq("id", orderId);
  }
  for (const riderId of riderIds) {
    await SVC.from("dispatch_log").delete().eq("rider_id", riderId);
    await SVC.from("notifications").delete().eq("user_id", riderId);
  }
  for (const userId of userIds) {
    await SVC.auth.admin.deleteUser(userId);
    await SVC.from("profiles").delete().eq("id", userId);
  }
}

/** Create a throwaway rider that is online and available for dispatch. */
async function createRider(rand, { activeCount = 0 } = {}) {
  const email = `dispatch-rider-${rand}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const created = await SVC.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
    user_metadata: { role: "rider" },
  });
  if (created.error) throw new Error(created.error.message);
  const id = created.user.id;
  const now = new Date().toISOString();
  await SVC.from("profiles").upsert(
    {
      id,
      email,
      full_name: `Dispatch Rider ${rand}`,
      first_name: "Dispatch",
      last_name: `Rider ${rand}`,
      role: "rider",
      is_active: true,
      rider_status: "available",
      phone: "09170000000",
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  // Give the rider synthetic active load so cap/fairness assertions have teeth.
  const load = [];
  for (let i = 0; i < activeCount; i++) {
    const { data: o } = await SVC.from("orders")
      .insert({
        id: crypto.randomUUID(),
        order_number: `LOAD-${rand}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        user_id: id,
        status: "claimed_by_rider",
        payment_method: "cod",
        payment_status: "verified",
        delivery_address: "load fixture",
        delivery_contact: "09170000000",
        rider_id: id,
        subtotal: 100,
        delivery_fee: 20,
        total: 120,
        rider_earnings: 20,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (o?.id) load.push(o.id);
  }

  return { id, email, loadOrderIds: load };
}

/** Create a ready_for_pickup order with no rider (the dispatch queue's shape). */
async function createQueueOrder(rand, customerId) {
  const { data, error } = await SVC.from("orders")
    .insert({
      id: crypto.randomUUID(),
      order_number: `DSP-${rand}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: customerId,
      status: "ready_for_pickup",
      payment_method: "cod",
      payment_status: "verified",
      delivery_address: "Dispatch test address, Janiuay, Iloilo",
      delivery_contact: "09171234567",
      rider_id: null,
      pending_riders: [],
      subtotal: 150,
      delivery_fee: 20,
      total: 170,
      rider_earnings: 20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, order_number")
    .single();
  if (error) throw new Error(`order insert failed: ${error.message}`);
  return data;
}

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const staff = await signIn("staff@seed.local", "password123");
  const rider = await signIn("rider@seed.local", "password123");
  const customer = await signIn("customer@seed.local", "password123");

  const createdRiders = [];
  const createdOrders = [];
  const loadOrderIds = [];

  // Fail loudly if migration 0030 is missing rather than failing confusingly.
  const { error: rpcErr } = await SVC.rpc("requeue_stale_assignments");
  if (rpcErr) {
    console.error("\nFATAL: dispatch RPCs are missing — run 0030_dispatch_queue.sql in the Supabase SQL editor.");
    console.error(rpcErr.message);
    process.exit(1);
  }

  const me = await createRider(rand);
  createdRiders.push(me.id);
  loadOrderIds.push(...me.loadOrderIds);

  try {
    // ---- Test 1: staff assigns a rider ----
    console.log("\n== Test 1: staff assign -> awaiting_rider ==");
    const o1 = await createQueueOrder(rand, customer.userId);
    createdOrders.push(o1.id);

    const board = await api(STAFF, "/api/dispatch", staff.cookie, "GET");
    ok("dispatch board returns 200", board.status === 200, JSON.stringify(board.json));
    ok("board lists unassigned orders", Array.isArray(board.json?.data?.unassigned));
    ok(
      "our queued order is on the board",
      (board.json?.data?.unassigned || []).some((x) => x.id === o1.id),
      "order not in unassigned[]",
    );
    ok("board lists ranked riders", Array.isArray(board.json?.data?.riders));
    ok(
      "created rider appears in the fair queue",
      (board.json?.data?.riders || []).some((x) => x.id === me.id),
      "rider missing from queue",
    );

    const assign = await api(STAFF, "/api/dispatch", staff.cookie, "POST", { order_id: o1.id, rider_id: me.id });
    ok("POST /api/dispatch assign succeeds", assign.status === 200, JSON.stringify(assign.json));
    ok("assign returns the rider id", assign.json?.data?.rider_id === me.id);

    const g1 = await getOrder(o1.id);
    ok("order status is awaiting_rider", g1.data?.status === "awaiting_rider", `got=${g1.data?.status}`);
    ok("order.rider_id set", g1.data?.rider_id === me.id);
    ok("rider_assigned_at stamped", !!g1.data?.rider_assigned_at);
    ok("legacy pending_riders cleared", (g1.data?.pending_riders || []).length === 0);

    const { data: log1 } = await SVC.from("dispatch_log").select("action, actor").eq("order_id", o1.id);
    ok(
      "dispatch_log has 'assigned'",
      (log1 || []).some((l) => l.action === "assigned"),
      JSON.stringify(log1),
    );

    const { data: notif1 } = await SVC.from("notifications")
      .select("type, title")
      .eq("user_id", me.id)
      .eq("type", "delivery_assignment");
    ok("rider notified of the assignment", (notif1 || []).length > 0);

    // ---- Test 2: rider accepts ----
    console.log("\n== Test 2: rider accepts -> claimed_by_rider ==");
    const accept = await api(RIDER, "/api/orders/status", rider.cookie, "POST", {
      order_id: o1.id,
      status: "claimed_by_rider",
    });
    ok("rider accept succeeds", accept.status === 200, JSON.stringify(accept.json));
    const g2 = await getOrder(o1.id);
    ok("order is claimed_by_rider", g2.data?.status === "claimed_by_rider", `got=${g2.data?.status}`);
    const { data: log2 } = await SVC.from("dispatch_log").select("action").eq("order_id", o1.id);
    ok(
      "dispatch_log records 'accepted'",
      (log2 || []).some((l) => l.action === "accepted"),
      JSON.stringify(log2),
    );

    // Second answer must be rejected (already answered).
    const again = await api(RIDER, "/api/orders/status", rider.cookie, "POST", {
      order_id: o1.id,
      status: "claimed_by_rider",
    });
    ok("re-answering is refused", again.status !== 200 || again.json?.success === false, JSON.stringify(again.json));

    // ---- Test 3: decline cascades to the next rider ----
    console.log("\n== Test 3: decline cascades to the next eligible rider ==");
    const me2 = await createRider(rand);
    createdRiders.push(me2.id);
    loadOrderIds.push(...me2.loadOrderIds);

    const o2 = await createQueueOrder(rand, customer.userId);
    createdOrders.push(o2.id);

    // Assign to me2 via the queue, then have me2 decline.
    const assign2 = await api(STAFF, "/api/dispatch", staff.cookie, "POST", { order_id: o2.id, rider_id: me2.id });
    ok("second assignment succeeds", assign2.status === 200, JSON.stringify(assign2.json));

    const session2 = await signIn(me2.email, "password123");
    const decline = await api(RIDER, "/api/orders/status", session2.cookie, "POST", {
      order_id: o2.id,
      status: "rejected",
    });
    ok("decline call returns 200", decline.status === 200, JSON.stringify(decline.json));

    const g3 = await getOrder(o2.id);
    const { data: log3 } = await SVC.from("dispatch_log").select("action, rider_id").eq("order_id", o2.id);
    ok(
      "dispatch_log records 'declined'",
      (log3 || []).some((l) => l.action === "declined"),
      JSON.stringify(log3),
    );

    if (g3.data?.rider_id) {
      // Another eligible rider existed -> it cascaded (the happy path).
      ok("decline cascaded to a different rider", g3.data.rider_id !== me2.id, `rider=${g3.data.rider_id}`);
      ok("cascaded order still awaiting_rider", g3.data.status === "awaiting_rider", `got=${g3.data.status}`);
      ok(
        "dispatch_log records the cascade hop",
        (log3 || []).some((l) => l.action === "cascaded" || l.action === "assigned"),
        JSON.stringify(log3),
      );
    } else {
      // Queue exhausted -> order handed back to staff.
      ok(
        "exhausted queue returns order to ready_for_pickup",
        g3.data?.status === "ready_for_pickup",
        `got=${g3.data?.status}`,
      );
      ok(
        "dispatch_log records 'exhausted'",
        (log3 || []).some((l) => l.action === "exhausted"),
        JSON.stringify(log3),
      );
      const { data: staffNotif } = await SVC.from("notifications").select("type").eq("type", "dispatch_exhausted");
      ok("staff paged when no riders remain", (staffNotif || []).length > 0);
    }

    // ---- Test 4: assign to an ineligible rider is refused ----
    console.log("\n== Test 4: invalid assignments are refused ==");
    const badRider = await api(STAFF, "/api/dispatch", staff.cookie, "POST", {
      order_id: o2.id,
      rider_id: "00000000-0000-0000-0000-000000000000",
    });
    ok("unknown rider rejected", badRider.status >= 400, `status=${badRider.status}`);

    const badOrder = await api(STAFF, "/api/dispatch", staff.cookie, "POST", {
      order_id: "00000000-0000-0000-0000-000000000000",
      rider_id: me.id,
    });
    ok("unknown order rejected", badOrder.status >= 400, `status=${badOrder.status}`);

    const noOrder = await api(STAFF, "/api/dispatch", staff.cookie, "POST", {});
    ok("missing order_id rejected", noOrder.status === 400, `status=${noOrder.status}`);

    // ---- Test 5: concurrency cap ----
    console.log("\n== Test 5: concurrency cap blocks over-cap assignment ==");
    const { data: biz } = await SVC.from("business").select("max_active_deliveries").limit(1).maybeSingle();
    const cap = Number(biz?.max_active_deliveries) || 2;

    const capped = await createRider(rand, { activeCount: cap });
    createdRiders.push(capped.id);
    loadOrderIds.push(...capped.loadOrderIds);

    const o5 = await createQueueOrder(rand, customer.userId);
    createdOrders.push(o5.id);

    const overCap = await api(STAFF, "/api/dispatch", staff.cookie, "POST", { order_id: o5.id, rider_id: capped.id });
    ok(`rider at cap (${cap}) cannot be assigned`, overCap.status >= 400, JSON.stringify(overCap.json));
    const g5 = await getOrder(o5.id);
    ok("over-cap order left untouched", g5.data?.rider_id === null, `rider=${g5.data?.rider_id}`);

    // Auto-assign must skip the capped rider and pick a free one instead.
    const auto = await api(STAFF, "/api/dispatch", staff.cookie, "POST", { order_id: o5.id });
    ok("auto-assign succeeds", auto.status === 200, JSON.stringify(auto.json));
    const g5b = await getOrder(o5.id);
    ok(
      "auto-assign skipped the over-cap rider",
      !!g5b.data?.rider_id && g5b.data.rider_id !== capped.id,
      `rider=${g5b.data?.rider_id}`,
    );

    // ---- Test 6: staff revoke ----
    console.log("\n== Test 6: staff revoke returns order to the queue ==");
    const revoke = await api(STAFF, "/api/dispatch", staff.cookie, "DELETE", { order_id: o5.id });
    ok("DELETE /api/dispatch revoke succeeds", revoke.status === 200, JSON.stringify(revoke.json));
    const g6 = await getOrder(o5.id);
    ok("rider detached", g6.data?.rider_id === null, `rider=${g6.data?.rider_id}`);
    ok("status back to ready_for_pickup", g6.data?.status === "ready_for_pickup", `got=${g6.data?.status}`);
    const { data: log6 } = await SVC.from("dispatch_log").select("action").eq("order_id", o5.id);
    ok(
      "dispatch_log records 'revoked'",
      (log6 || []).some((l) => l.action === "revoked"),
      JSON.stringify(log6),
    );

    // Revoking an unassigned order must fail loudly.
    const revoke2 = await api(STAFF, "/api/dispatch", staff.cookie, "DELETE", { order_id: o5.id });
    ok("revoking an unassigned order is refused", revoke2.status >= 400, `status=${revoke2.status}`);

    // ---- Test 6b: pre-dispatch kitchen status is restored ----
    console.log("\n== Test 6b: revoke restores the pre-dispatch kitchen status ==");
    const o6b = await createQueueOrder(rand, customer.userId);
    createdOrders.push(o6b.id);
    // Simulate staff assigning a rider while the kitchen is still preparing.
    await SVC.from("orders").update({ status: "preparing" }).eq("id", o6b.id);
    const assign6b = await api(STAFF, "/api/dispatch", staff.cookie, "POST", { order_id: o6b.id, rider_id: me.id });
    ok("preparing order can be pre-assigned", assign6b.status === 200, JSON.stringify(assign6b.json));
    const g6b1 = await getOrder(o6b.id);
    ok("pre-assign moves order to awaiting_rider", g6b1.data?.status === "awaiting_rider", `got=${g6b1.data?.status}`);

    await api(STAFF, "/api/dispatch", staff.cookie, "DELETE", { order_id: o6b.id });
    const g6b2 = await getOrder(o6b.id);
    ok(
      "revoke returns the order to 'preparing' (not ready_for_pickup)",
      g6b2.data?.status === "preparing",
      `got=${g6b2.data?.status}`,
    );
    ok("dispatch_prev_status cleared after restore", g6b2.data?.dispatch_prev_status == null);

    // ---- Test 7: stale assignment is re-queued ----
    console.log("\n== Test 7: 10-minute timeout re-queues the assignment ==");
    const o7 = await createQueueOrder(rand, customer.userId);
    createdOrders.push(o7.id);
    await api(STAFF, "/api/dispatch", staff.cookie, "POST", { order_id: o7.id, rider_id: me.id });
    // Backdate the assignment past the 10-minute window.
    await SVC.from("orders")
      .update({ rider_assigned_at: new Date(Date.now() - 15 * 60_000).toISOString() })
      .eq("id", o7.id);

    const board2 = await api(STAFF, "/api/dispatch", staff.cookie, "GET"); // sweeps stale rows
    ok("board refresh after sweep succeeds", board2.status === 200, JSON.stringify(board2.json));
    const { data: log7 } = await SVC.from("dispatch_log").select("action").eq("order_id", o7.id);
    ok(
      "dispatch_log records 'timeout'",
      (log7 || []).some((l) => l.action === "timeout"),
      JSON.stringify(log7),
    );

    const g7 = await getOrder(o7.id);
    ok(
      "stale assignment was handed on (reassigned or returned to queue)",
      g7.data?.status !== "awaiting_rider" || g7.data?.rider_assigned_at !== null,
      JSON.stringify(g7.data),
    );
    ok(
      "stale order no longer waiting on the silent rider",
      g7.data?.status !== "awaiting_rider" || g7.data?.rider_id !== me.id,
      JSON.stringify(g7.data),
    );

    // ---- Test 8: unauthorized access ----
    console.log("\n== Test 8: customers cannot drive the dispatch API ==");
    const custBoard = await api(STAFF, "/api/dispatch", customer.cookie, "GET");
    ok(
      "customer blocked from dispatch board",
      custBoard.status === 401 || custBoard.status === 403,
      `status=${custBoard.status}`,
    );
    const anonBoard = await api(STAFF, "/api/dispatch", null, "GET");
    ok(
      "anonymous blocked from dispatch board",
      anonBoard.status === 401 || anonBoard.status === 403,
      `status=${anonBoard.status}`,
    );
  } finally {
    console.log("\nCleanup…");
    await cleanup({
      orderIds: [...createdOrders, ...loadOrderIds],
      riderIds: createdRiders,
      userIds: createdRiders,
    });
  }

  console.log(`\n===========================================`);
  console.log(`  RESULT: ${pass} passed, ${fail} failed`);
  console.log(`===========================================`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
