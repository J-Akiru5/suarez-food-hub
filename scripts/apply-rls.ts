/**
 * Apply RLS policies to the Supabase database using direct PostgreSQL connection.
 * Prisma's DATABASE_URL gives us direct DB access to run DDL commands.
 *
 * Run: npx tsx scripts/apply-rls.ts
 */
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not set. Prisma uses this to connect.");
  process.exit(1);
}

async function main() {
  console.log("🔌 Connecting to database...");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("✅ Connected!\n");

  // Check current policies on profiles table
  const existingPolicies = await client.query(`
    SELECT policyname, permissive, cmd, qual 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
    ORDER BY policyname;
  `);

  console.log("📋 Current RLS policies on profiles table:");
  if (existingPolicies.rows.length === 0) {
    console.log("   (none)");
  } else {
    existingPolicies.rows.forEach((p: any) => {
      console.log(`   - ${p.policyname} (${p.cmd}, ${p.permissive})`);
    });
  }

  // Check if RLS is enabled
  const rlsStatus = await client.query(`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace;
  `);

  const rlsEnabled = rlsStatus.rows[0]?.relrowsecurity;
  console.log(`\n🔒 RLS enabled on profiles: ${rlsEnabled ? "YES" : "NO"}`);

  if (!rlsEnabled) {
    console.log("   Enabling RLS on profiles...");
    await client.query(`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`);
    console.log("   ✅ RLS enabled!");
  }

  // Apply the missing "profiles public read" policy
  const hasPublicReadPolicy = existingPolicies.rows.some((p: any) => p.policyname === "profiles public read");

  if (!hasPublicReadPolicy) {
    console.log("\n🛠️  Creating 'profiles public read' policy (FOR SELECT USING true)...");
    await client.query(`
      DROP POLICY IF EXISTS "profiles public read" ON profiles;
      CREATE POLICY "profiles public read" ON profiles 
        FOR SELECT USING (true);
    `);
    console.log("   ✅ Policy created!");
  } else {
    console.log("\n✅ 'profiles public read' policy already exists.");
  }

  // Also ensure the insert/update/delete policies exist
  const policyDefs = [
    {
      name: "users insert own profile",
      sql: `DROP POLICY IF EXISTS "users insert own profile" ON profiles;
            CREATE POLICY "users insert own profile" ON profiles 
              FOR INSERT WITH CHECK (auth.uid() = id);`,
    },
    {
      name: "users update own profile",
      sql: `DROP POLICY IF EXISTS "users update own profile" ON profiles;
            CREATE POLICY "users update own profile" ON profiles 
              FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`,
    },
    {
      name: "admin update profiles",
      sql: `DROP POLICY IF EXISTS "admin update profiles" ON profiles;
            CREATE POLICY "admin update profiles" ON profiles 
              FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());`,
    },
    {
      name: "admin delete profiles",
      sql: `DROP POLICY IF EXISTS "admin delete profiles" ON profiles;
            CREATE POLICY "admin delete profiles" ON profiles 
              FOR DELETE USING (public.is_admin());`,
    },
  ];

  for (const policy of policyDefs) {
    const exists = existingPolicies.rows.some((p: any) => p.policyname === policy.name);
    if (!exists) {
      console.log(`\n🛠️  Creating '${policy.name}' policy...`);
      await client.query(policy.sql);
      console.log(`   ✅ Policy created!`);
    } else {
      console.log(`\n✅ '${policy.name}' policy already exists.`);
    }
  }

  console.log("\n=== VERIFICATION ===");
  const verify = await client.query(`
    SELECT policyname, cmd, qual 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
    ORDER BY policyname;
  `);

  console.log("Policies on profiles table:");
  verify.rows.forEach((p: any) => {
    console.log(`   ✅ ${p.policyname} (${p.cmd})`);
  });

  await client.end();
  console.log("\n🎉 Done! The admin page should now show riders.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
