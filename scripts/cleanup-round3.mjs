// Clean up all data created by scripts/verify-round3.mjs + the cashout UI test:
//   - GCash order + items (740e9ffa-...) + its customer (verify3*@example.com)
//   - payment_proofs image uploaded for that order
//   - cashouttest@example.com rider (profile, earnings, cashouts, test order)

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

const SVC = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const STORAGE_URL = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/payment_proofs`;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  // 1. The GCash order kept for the admin preview check
  const orderId = "740e9ffa-31b6-4034-a4ca-7f2e4224a3f1";
  const { data: order } = await SVC.from("orders").select("user_id, payment_proof_url").eq("id", orderId).maybeSingle();
  if (order) {
    await SVC.from("order_items").delete().eq("order_id", orderId);
    await SVC.from("orders").delete().eq("id", orderId);
    console.log("GCash order + items deleted");
    // 2. Remove the proof image from storage
    if (order.payment_proof_url) {
      const path = order.payment_proof_url.split("/payment_proofs/")[1];
      if (path) {
        const res = await fetch(`${STORAGE_URL}/${path}`, {
          method: "DELETE",
          headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        });
        console.log(`proof image removed (${res.status})`);
      }
    }
    // 3. Delete the customer (auth + profile)
    if (order.user_id) {
      await SVC.from("feedback").delete().eq("user_id", order.user_id);
      await SVC.auth.admin.deleteUser(order.user_id);
      await SVC.from("profiles").delete().eq("id", order.user_id);
      console.log("verify3 customer deleted");
    }
  } else {
    console.log("GCash order already gone");
  }

  // 4. cashouttest rider
  const { data: users } = await SVC.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const rider = users.users.find((u) => u.email === "cashouttest@example.com");
  if (rider) {
    const rid = rider.id;
    const { data: cashouts } = await SVC.from("rider_cashouts").select("id").eq("rider_id", rid);
    for (const c of cashouts || []) await SVC.from("rider_cashouts").delete().eq("id", c.id);
    const { data: earnings } = await SVC.from("rider_earnings").select("order_id").eq("rider_id", rid);
    for (const e of earnings || []) {
      await SVC.from("rider_earnings").delete().eq("order_id", e.order_id);
      await SVC.from("order_items").delete().eq("order_id", e.order_id);
      await SVC.from("orders").delete().eq("id", e.order_id);
    }
    await SVC.from("profiles").delete().eq("id", rid);
    await SVC.auth.admin.deleteUser(rid);
    console.log("cashouttest rider + data deleted");
  } else {
    console.log("cashouttest rider already gone");
  }

  console.log("cleanup done");
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
