import { createAuthClient } from "@repo/data-access/client";
import { createOrderStatusLog, updateOrderStatus } from "@repo/data-access/data/orders";
import { getProfileRole } from "@repo/data-access/data/profiles";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getProfileRole(supabase, user.id);

    if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (profile.is_active === false) {
      return NextResponse.json({ error: "Account inactive" }, { status: 403 });
    }

    const body = await request.json();
    const { order_id, status } = body;

    if (!order_id || !status) {
      return NextResponse.json({ error: "order_id and status required" }, { status: 400 });
    }

    const allowedStatuses = ["confirmed", "preparing", "ready_for_pickup"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Staff cannot set this status" }, { status: 403 });
    }

    const timestampPatch: Record<string, string> = {};
    if (status === "confirmed") timestampPatch.confirmed_at = new Date().toISOString();
    if (status === "preparing") timestampPatch.prepared_at = new Date().toISOString();

    const { error } = await updateOrderStatus(supabase, order_id, status, {
      ...timestampPatch,
      staff_id: user.id,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await createOrderStatusLog(supabase, order_id, status, user.id, `Set by ${profile.role}`);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
