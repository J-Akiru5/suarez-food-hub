import { createAuthClient } from "@repo/data-access/client";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createAuthClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin")
    return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  return { user, profile };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { email, password, firstName, lastName, phone, username } = await request.json();

  if (!email || !password || !firstName || !lastName || !username) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
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
    return NextResponse.json(
      { success: false, error: authError?.message || "Failed to create account" },
      { status: 500 },
    );
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: authData.user.id,
    full_name: `${firstName} ${lastName}`,
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone || "",
    role: "staff",
    username: username,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return NextResponse.json(
      { success: false, error: `Account created but profile failed: ${profileError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { name: `${firstName} ${lastName}` } });
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("role", "staff")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data || [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { id, is_active, first_name, last_name, email, phone, username } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const updateFields: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (is_active !== undefined) updateFields.is_active = is_active;
  if (first_name !== undefined) updateFields.first_name = first_name;
  if (last_name !== undefined) updateFields.last_name = last_name;
  if (phone !== undefined) updateFields.phone = phone;
  if (username !== undefined) updateFields.username = username;
  if (first_name !== undefined || last_name !== undefined) {
    const current = first_name ?? "";
    const currentLast = last_name ?? "";
    updateFields.full_name = `${current} ${currentLast}`.trim();
  }

  const { error } = await supabaseAdmin.from("profiles").update(updateFields).eq("id", id).eq("role", "staff");

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete the auth user first, then the profile
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (authError) {
    return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
  }

  // Profile is deleted by CASCADE from auth user deletion
  return NextResponse.json({ success: true });
}
