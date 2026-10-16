import { getUser, requireStaffOrAdmin } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import {
  assignRider,
  DISPATCHABLE_STATUSES,
  getRankedRiders,
  requeueStaleAssignments,
  revokeAssignment,
} from "@repo/data-access/data/dispatch";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

async function requireStaff() {
  const cookieStore = await cookies();
  const authClient = createAuthClient(cookieStore);
  const user = await getUser(authClient);
  if (!user) return { status: 401 as const, error: "Unauthorized" };
  const serviceSupabase = createServiceClient();
  const isStaff = await requireStaffOrAdmin(serviceSupabase, user.id);
  if (!isStaff) return { status: 403 as const, error: "Forbidden" };
  return { user, supabase: serviceSupabase };
}

/**
 * GET /api/dispatch — the staff dispatch board payload.
 * Ranked rider queue + unassigned orders + awaiting-response orders + log.
 * Also sweeps timed-out assignments so the board never shows ghosts.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireStaff();
    if ("error" in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const { supabase } = auth;

    // Lazy timeout sweep — requeues assignments the rider never answered.
    await requeueStaleAssignments(supabase);

    const { data: biz } = await supabase.from("business").select("max_active_deliveries").limit(1).maybeSingle();
    const maxActive = Number(biz?.max_active_deliveries) || 2;

    const riders = await getRankedRiders(supabase, maxActive);

    const [unassignedRes, awaitingRes, logRes] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_number, status, payment_method, payment_status, subtotal, delivery_fee, total, created_at, delivery_address, item_count:order_items(count)",
        )
        .in("status", DISPATCHABLE_STATUSES as unknown as string[])
        .is("rider_id", null)
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("orders")
        .select(
          "id, order_number, status, rider_id, rider_assigned_at, total, created_at, rider:profiles!orders_rider_id_fkey(first_name, last_name)",
        )
        .eq("status", "awaiting_rider")
        .order("rider_assigned_at", { ascending: true })
        .limit(50),
      supabase
        .from("dispatch_log")
        .select(
          "id, order_id, rider_id, action, actor, created_at, order:orders(order_number), r:profiles!dispatch_log_rider_id_fkey(first_name, last_name)",
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        riders,
        unassigned: unassignedRes.data || [],
        awaiting: awaitingRes.data || [],
        log: logRes.data || [],
        max_active_deliveries: maxActive,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/dispatch — assign a rider.
 * Body: { order_id, rider_id? }  (rider_id omitted → fair auto-assign)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireStaff();
    if ("error" in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const { order_id, rider_id } = body;
    if (!order_id) {
      return NextResponse.json({ success: false, error: "order_id required" }, { status: 400 });
    }

    const result = await assignRider(auth.supabase, {
      orderId: order_id,
      riderId: rider_id || undefined,
      actorId: auth.user.id,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }
    return NextResponse.json({ success: true, data: { rider_id: result.rider_id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/dispatch — revoke an assignment (staff override).
 * Body: { order_id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireStaff();
    if ("error" in auth) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const { order_id } = body;
    if (!order_id) {
      return NextResponse.json({ success: false, error: "order_id required" }, { status: 400 });
    }

    const result = await revokeAssignment(auth.supabase, { orderId: order_id, actorId: auth.user.id });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
