import { createServiceClient } from "@repo/data-access/client";
import { createNotifications } from "@repo/data-access/data/notifications";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    const body = await req.json();
    const { email, password, first_name, last_name, username, phone, vehicle_type, plate_number, license_number } =
      body;

    if (!email || !password || !first_name || !last_name || !username) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Check if username is taken
    const { data: existing } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: false, error: "Username is already taken" }, { status: 409 });
    }

    // Create auth user
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role: "rider" },
    });

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ success: false, error: "Failed to create user" }, { status: 500 });
    }

    // Create profile
    const now = new Date().toISOString();
    const { error: profileError } = await serviceSupabase.from("profiles").insert({
      id: authData.user.id,
      email,
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`,
      username,
      phone: phone || "N/A",
      role: "rider",
      rider_status: "pending_approval",
      vehicle_type: vehicle_type || "motorcycle",
      plate_number: plate_number || "",
      license_number: license_number || "",
      is_active: false,
      created_at: now,
      updated_at: now,
    });

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await serviceSupabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ success: false, error: `Profile error: ${profileError.message}` }, { status: 500 });
    }

    // Notify admins about new rider registration
    const { data: admins } = await serviceSupabase.from("profiles").select("id").eq("role", "admin");

    if (admins && admins.length > 0) {
      await createNotifications(
        serviceSupabase,
        admins.map((a) => ({
          user_id: a.id,
          type: "rider_pending_approval",
          title: "New Rider Registration",
          message: `${first_name} ${last_name} has registered as a rider and needs your approval.`,
          data: { rider_id: authData.user.id },
        })),
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: authData.user.id },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
