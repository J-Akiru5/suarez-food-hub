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

// DELETE /api/riders?id=... — permanently delete a rider (auth user + profile).
// The profiles FK does NOT cascade from auth.users, so both must be deleted
// explicitly or the auth user is orphaned and can still authenticate.
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

  // Confirm the target is actually a rider before deleting.
  const { data: profileRow } = await supabaseAdmin.from("profiles").select("id, role").eq("id", id).maybeSingle();
  if (profileRow && profileRow.role !== "rider") {
    return NextResponse.json({ success: false, error: "Only rider accounts can be deleted here" }, { status: 403 });
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (authError) {
    return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", id);
  if (profileError) {
    return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/riders — update a rider's status (resign / offline / reactivate).
// Routed through the server so the update works even when RLS on profiles is
// missing/stale in the live DB (the previous client-side update silently no-opped).
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { id, rider_status, is_active } = body;

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
  }

  const validStatuses = ["available", "vacant", "occupied", "offline", "resigned", "rejected", "pending_approval"];
  if (rider_status && !validStatuses.includes(rider_status)) {
    return NextResponse.json({ success: false, error: "Invalid rider status" }, { status: 400 });
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Confirm the target is actually a rider before updating.
  const { data: profileRow } = await supabaseAdmin.from("profiles").select("id, role").eq("id", id).maybeSingle();
  if (profileRow && profileRow.role !== "rider") {
    return NextResponse.json({ success: false, error: "Only rider accounts can be updated here" }, { status: 403 });
  }
  if (!profileRow) {
    return NextResponse.json({ success: false, error: "Rider not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rider_status) updates.rider_status = rider_status;
  if (typeof is_active === "boolean") updates.is_active = is_active;

  const { error: updateError } = await supabaseAdmin.from("profiles").update(updates).eq("id", id);
  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
