/**
 * Diagnostic script to check rider profiles using BOTH the service role key
 * and the anon key (to simulate what the admin page does).
 *
 * Run: npx tsx scripts/check-riders.ts
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set");
  process.exit(1);
}

console.log(`🔗 Supabase URL: ${supabaseUrl}`);
console.log(`   Service Key:  ${serviceRoleKey ? "✅ Set" : "❌ Not set"}`);
console.log(`   Anon Key:     ${anonKey ? `✅ Set (${anonKey.substring(0, 10)}...)` : "❌ Not set"}`);
console.log("");

async function queryWithKey(label: string, key: string) {
  const client = createClient(supabaseUrl as string, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n=== QUERYING WITH ${label} ===`);

  const { data, error } = await client
    .from("profiles")
    .select("id, email, username, first_name, last_name, role, rider_status, is_active")
    .eq("role", "rider")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`❌ ERROR: ${error.code} - ${error.message}`);
    console.error(`   Details:`, JSON.stringify(error, null, 2));
    return;
  }

  console.log(`✅ Success! Found ${data?.length || 0} riders.`);

  if (data && data.length > 0) {
    data.forEach((r, i) => {
      console.log(`   [${i + 1}] ${r.first_name || "?"} ${r.last_name || "?"} (${r.email || "no email"})`);
      console.log(`       role=${r.role} | rider_status=${r.rider_status || "—"} | is_active=${r.is_active}`);
    });
  } else {
    console.log("   No riders found — this matches what the admin page shows!");
    console.log("   The admin page would see 'No riders registered'.");
  }
}

async function main() {
  // Test with service role key first
  if (!serviceRoleKey) {
    console.log("⚠️  SUPABASE_SERVICE_ROLE_KEY not set — cannot test with service role.");
  } else {
    await queryWithKey("SERVICE ROLE KEY", serviceRoleKey);
  }

  // Test with anon key (this is what the admin page uses)
  if (!anonKey) {
    console.log("⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not set — cannot test with anon key.");
  } else {
    await queryWithKey("ANON KEY", anonKey);
  }

  console.log("\n=== DIAGNOSIS ===");
  if (!anonKey) {
    console.log("💡 The anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is NOT set!");
    console.log("   The admin app's createBrowserTypedClient() would use 'placeholder' as the key.");
    console.log("   This means all Supabase queries from the admin page would FAIL.");
  } else if (serviceRoleKey && anonKey) {
    console.log("Both keys are set. If service role works but anon doesn't, it's an RLS issue.");
    console.log("If both work, the admin page should show riders. Check the admin app's env vars.");
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
