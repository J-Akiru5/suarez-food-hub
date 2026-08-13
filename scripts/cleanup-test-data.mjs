// Cleanup: remove every test account created by scripts/verify-round2.mjs and
// the e2e suite, plus all their related data (orders, earnings, feedback, etc.).
// Patterns: verify*@example.com, e2e*@example.com, *@test.local, proof-test-*.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const likePatterns = [
  "verify%@example.com",
  "e2e%@example.com",
  "%@test.local",
];

const { data: profiles, error } = await supabase
  .from("profiles")
  .select("id, email, username")
  .or(likePatterns.map((p) => `email.ilike.${p}`).join(","));

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

console.log(`Found ${profiles?.length || 0} test profiles`);
if (!profiles?.length) process.exit(0);

const ids = profiles.map((p) => p.id);

// Delete related rows first (order matters for FKs)
const { data: orders } = await supabase
  .from("orders")
  .select("id")
  .in("user_id", ids);
const orderIds = (orders || []).map((o) => o.id);
console.log(`  ${orderIds.length} test orders`);

async function safeDelete(table, column, values) {
  if (!values.length) return;
  const { error: e } = await supabase.from(table).delete().in(column, values);
  if (e) console.log(`  !! ${table}: ${e.message}`);
  else console.log(`  deleted ${table} (${values.length})`);
}

if (orderIds.length) {
  await safeDelete("order_items", "order_id", orderIds);
  await safeDelete("order_status_log", "order_id", orderIds);
}
await safeDelete("rider_earnings", "order_id", orderIds.length ? orderIds : ["__none__"]);
await safeDelete("rider_earnings", "rider_id", ids);
await safeDelete("rider_cashouts", "rider_id", ids);
await safeDelete("rider_reviews", "user_id", ids);
await safeDelete("rider_reviews", "rider_id", ids);
await safeDelete("product_reviews", "user_id", ids);
await safeDelete("feedback", "user_id", ids);
await safeDelete("notifications", "user_id", ids);
await safeDelete("rider_locations", "rider_id", ids);
await safeDelete("carts", "user_id", ids);
await safeDelete("orders", "user_id", ids);
await safeDelete("orders", "rider_id", ids);

// Storage objects in the test users' folders
for (const bucket of ["payment_proofs", "delivery_proofs"]) {
  for (const id of ids) {
    const { data: objs } = await supabase.storage.from(bucket).list(id);
    if (objs?.length) {
      await supabase.storage
        .from(bucket)
        .remove(objs.map((o) => `${id}/${o.name}`));
      console.log(`  removed ${objs.length} object(s) from ${bucket}/${id.slice(0, 8)}`);
    }
  }
}

// Profiles, then auth users
await safeDelete("profiles", "id", ids);
for (const p of profiles) {
  const { error: e } = await supabase.auth.admin.deleteUser(p.id);
  console.log(`  auth user ${p.email}: ${e ? "ERR " + e.message : "deleted"}`);
}

console.log("Cleanup complete.");
