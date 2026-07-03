import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Make sure .env is configured.");
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";
const password = process.env.SEED_USER_PASSWORD;

if (!password) {
  if (isProduction) {
    console.error(
      "SEED_USER_PASSWORD is not set and NODE_ENV=production. " +
        "Refusing to seed production with a default password. " +
        "Set the SEED_USER_PASSWORD env var and retry.",
    );
    process.exit(1);
  }
  console.log("SEED_USER_PASSWORD not set — using default \"password123\" (NODE_ENV is not production)");
}

const seedPassword = password || "password123";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type SeedUser = {
  email: string;
  role: "customer" | "admin" | "staff" | "rider";
  firstName: string;
  lastName: string;
  extra?: Record<string, unknown>;
};

const SEED_USERS: SeedUser[] = [
  {
    email: "customer@seed.local",
    role: "customer",
    firstName: "Test",
    lastName: "Customer",
  },
  {
    email: "admin@seed.local",
    role: "admin",
    firstName: "Test",
    lastName: "Admin",
  },
  {
    email: "staff@seed.local",
    role: "staff",
    firstName: "Test",
    lastName: "Staff",
  },
  {
    email: "rider@seed.local",
    role: "rider",
    firstName: "Test",
    lastName: "Rider",
    extra: { rider_status: "available", is_active: true },
  },
];

async function seedUser(user: SeedUser) {
  // Check if auth user already exists
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error(`  Failed to list users: ${listError.message}`);
    return false;
  }

  const existing = users.users.find((u) => u.email === user.email);
  let userId: string;

  if (existing) {
    userId = existing.id;
    console.log(`  Auth user already exists (${userId}), skipping creation.`);
  } else {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: seedPassword,
      email_confirm: true,
    });
    if (authError) {
      console.error(`  Failed to create auth user: ${authError.message}`);
      return false;
    }
    userId = authData.user.id;
    console.log(`  Auth user created (${userId}).`);
  }

  // Upsert profile
  const now = new Date().toISOString();
  const profilePayload = {
    id: userId,
    full_name: `${user.firstName} ${user.lastName}`,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    phone: "N/A",
    address: "N/A",
    street_address: "N/A",
    zip_code: "",
    role: user.role,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...user.extra,
  };

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (profileError) {
    console.error(`  Failed to upsert profile: ${JSON.stringify(profileError, null, 2)}`);
    return false;
  }

  console.log(`  Profile upserted with role="${user.role}".`);
  return true;
}

async function main() {
  console.log("Seeding test users...\n");
  let succeeded = 0;
  let failed = 0;

  for (const user of SEED_USERS) {
    console.log(`[${user.role}] ${user.email}`);
    const ok = await seedUser(user);
    if (ok) succeeded++;
    else failed++;
    console.log();
  }

  console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
