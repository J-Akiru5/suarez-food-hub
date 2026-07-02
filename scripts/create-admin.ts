import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars. Make sure .env is configured.");
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

  const adminUser = users.users.find((u) => u.email === "admin@gmail.com");
  if (!adminUser) {
    console.log("Auth user not found. Creating new user...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@gmail.com",
      password: "admin123",
      email_confirm: true,
    });
    if (authError) {
      console.error("Failed to create auth user:", authError.message);
      process.exit(1);
    }
    console.log("✅ Auth user created:", authData.user.id);
    var userId = authData.user.id;
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
      email: "admin@gmail.com",
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
  console.log("   Email:    admin@gmail.com");
  console.log("   Password: admin123");
}

createAdminProfile().catch(console.error);
