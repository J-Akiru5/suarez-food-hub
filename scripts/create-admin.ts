import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_SEED_EMAIL;
const adminPassword = process.env.ADMIN_SEED_PASSWORD;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars. Make sure .env is configured.");
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error("Missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD env vars.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAdminProfile() {
  // Find the user by email
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const adminUser = users.users.find((u) => u.email === adminEmail);
  if (!adminUser) {
    console.log("Auth user not found. Creating new user...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (authError) {
      console.error("Failed to create auth user:", authError.message);
      process.exit(1);
    }
    console.log("✅ Auth user created:", authData.user.id);
    var _userId = authData.user.id;
  } else {
    console.log("✅ Found existing auth user:", adminUser.id);
    var userId = adminUser.id;
  }

  // Create/update the admin profile
  const now = new Date().toISOString();
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      full_name: "Admin",
      first_name: "Admin",
      last_name: "User",
      email: adminEmail,
      phone: "N/A",
      address: "N/A",
      street_address: "N/A",
      zip_code: "",
      role: "admin",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    console.error("Failed to create profile:", JSON.stringify(profileError, null, 2));
    process.exit(1);
  }

  console.log("✅ Profile created/updated with admin role");
  console.log("\n🎉 Admin account ready!");
  console.log(`   Email:    ${adminEmail}`);
}

createAdminProfile().catch(console.error);
