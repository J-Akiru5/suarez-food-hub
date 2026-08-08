import { getUser } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// DELETE /api/account — soft-delete the signed-in user's account.
// The profile row is deactivated and PII anonymized (orders are preserved for
// record-keeping), the cart is cleared, and the session is revoked. A hard
// delete is not possible because orders reference the profile via FK.
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const user = await getUser(authClient);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = createServiceClient();

    // Only customers may self-delete — staff/admin/rider accounts are managed by an admin
    const { data: profileRow } = await serviceSupabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileRow && profileRow.role !== "customer") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: updated, error } = await serviceSupabase
      .from("profiles")
      .update({
        is_active: false,
        full_name: "Deleted User",
        first_name: "Deleted",
        last_name: "User",
        email: null,
        username: null,
        phone: "",
        address: "",
        street_address: "",
        avatar_url: null,
        valid_id_url: null,
        rider_status: null,
        vehicle_type: null,
        plate_number: null,
        license_number: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    if (!updated) {
      // Old account with no profile row — create a deactivated one so the account stays locked
      const { error: upsertError } = await serviceSupabase.from("profiles").upsert({
        id: user.id,
        full_name: "Deleted User",
        first_name: "Deleted",
        last_name: "User",
        role: "customer",
        phone: "",
        address: "",
        street_address: "",
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (upsertError) return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
    }

    // Clear the user's cart
    await serviceSupabase.from("user_carts").delete().eq("user_id", user.id);

    // Revoke the session
    await authClient.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
