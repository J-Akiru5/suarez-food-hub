import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password, firstName, lastName, phone } = await request.json();

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || "Failed to create account" }, { status: 500 });
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: authData.user.id,
    full_name: `${firstName} ${lastName}`,
    first_name: firstName,
    last_name: lastName,
    phone: phone || "",
    role: "staff",
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return NextResponse.json({ error: "Account created but profile failed: " + profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, name: `${firstName} ${lastName}` });
}

export async function GET() {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("role", "staff")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function PATCH(request: Request) {
  const { id, is_active } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("role", "staff");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
