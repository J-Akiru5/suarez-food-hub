import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { createRiderEarning } from "@repo/data-access/data/earnings";
import { createNotification } from "@repo/data-access/data/notifications";
import { getOrderById, updateOrderStatus } from "@repo/data-access/data/orders";
import { deductStockForOrderIfNeeded } from "@repo/data-access/data/products";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Valid status transitions a rider can make
// Riders can accept/reject ANY order they're invited to (via pending_riders),
// regardless of kitchen status. The "claimed_by_rider" set on accept,
// and follow the normal flow from there.
const RIDER_STATUS_FLOW: Record<string, string[]> = {
  pending: ["claimed_by_rider", "rejected"],
  confirmed: ["claimed_by_rider", "rejected"],
  preparing: ["claimed_by_rider", "rejected"],
  ready_for_pickup: ["claimed_by_rider", "rejected"],
  claimed_by_rider: ["out_for_delivery"],
  out_for_delivery: ["near_customer"],
  near_customer: ["delivered"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, status, delivery_proof_url } = body;

    if (!order_id || !status) {
      return NextResponse.json({ success: false, error: "order_id and status required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceClient();

    const order = await getOrderById(supabase, order_id);
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    // Check authorization: rider must be assigned OR in pending_riders (broadcast model)
    const pendingRiders = (order as any).pending_riders || [];
    const isAssigned = order.rider_id === user.id;
    const isInvited = pendingRiders.includes(user.id);
    if (!isAssigned && !isInvited)
      return NextResponse.json({ success: false, error: "Not authorized for this order" }, { status: 403 });

    // Validate status transition
    const allowedNext = RIDER_STATUS_FLOW[order.status];
    if (!allowedNext?.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot transition from "${order.status}" to "${status}".`,
        },
        { status: 400 },
      );
    }

    // Handle rejection: remove rider from pending_riders (broadcast model)
    if (status === "rejected") {
      const updatedPending = pendingRiders.filter((id: string) => id !== user.id);
      const updatePayload: Record<string, any> = {
        pending_riders: updatedPending,
        updated_at: new Date().toISOString(),
      };
      // If no more pending riders, set status back to confirmed so staff knows
      if (updatedPending.length === 0) {
        updatePayload.status = "confirmed";
      }

      const { error: rejectError } = await supabase.from("orders").update(updatePayload).eq("id", order_id);
      if (rejectError) return NextResponse.json({ success: false, error: rejectError.message }, { status: 500 });

      // Notify staff about the rejection
      const { data: staff } = await supabase.from("profiles").select("id").in("role", ["admin", "staff"]);
      if (staff) {
        const staffNotifs = staff.map((s) => ({
          user_id: s.id,
          type: "rider_rejected",
          title: "Rider Rejected Delivery",
          message: `Rider rejected order #${order_id.slice(0, 8)}.${updatedPending.length > 0 ? ` ${updatedPending.length} rider(s) still pending.` : " Please reassign."}`,
          data: { order_id },
        }));
        await supabase.from("notifications").insert(staffNotifs);
      }

      return NextResponse.json({ success: true });
    }

    // Handle acceptance (claimed_by_rider): this rider wins the order
    if (status === "claimed_by_rider") {
      const _extraFields: Record<string, string> = {
        picked_up_at: new Date().toISOString(),
      };

      // Set this rider as the assigned rider and clear pending_riders
      const { error: acceptError } = await supabase
        .from("orders")
        .update({
          rider_id: user.id,
          pending_riders: [],
          status: "claimed_by_rider",
          picked_up_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id);
      if (acceptError) return NextResponse.json({ success: false, error: acceptError.message }, { status: 500 });

      // 🔁 Deduct stock on acceptance. Riders may accept an order straight from
      // "pending" (broadcast model), which skips staff confirm entirely — the
      // client reported stock never decreasing even after delivery for exactly
      // this path. The helper is keyed on confirmed_at so it's a no-op if staff
      // already confirmed (stock already deducted).
      await deductStockForOrderIfNeeded(supabase, order_id, { notifyLowStock: true });

      // Notify other pending riders that the order was taken
      const otherRiderIds = pendingRiders.filter((id: string) => id !== user.id);
      if (otherRiderIds.length > 0) {
        const otherNotifs = otherRiderIds.map((riderId: string) => ({
          user_id: riderId,
          type: "delivery_taken",
          title: "Delivery No Longer Available",
          message: "Another rider has accepted the delivery order.",
          data: { order_id },
        }));
        await supabase.from("notifications").insert(otherNotifs);
      }

      // Notify staff that rider accepted
      const { data: staff } = await supabase.from("profiles").select("id").in("role", ["admin", "staff"]);
      if (staff) {
        const staffNotifs = staff.map((s) => ({
          user_id: s.id,
          type: "rider_accepted",
          title: "Rider Accepted Delivery",
          message: `Rider has accepted order #${order_id.slice(0, 8)}.`,
          data: { order_id, rider_id: user.id },
        }));
        await supabase.from("notifications").insert(staffNotifs);
      }

      return NextResponse.json({ success: true });
    }

    // For other status transitions (out_for_delivery, near_customer, delivered)
    const extraFields: Record<string, string> = {};
    if (status === "delivered") {
      extraFields.delivered_at = new Date().toISOString();
      if (delivery_proof_url) extraFields.delivery_proof_url = delivery_proof_url;
    }

    const { error: updateError } = await updateOrderStatus(supabase, order_id, status, extraFields);
    if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });

    // 🔁 Safety net: if the order somehow reached "delivered" without stock
    // ever being deducted (e.g. status was set directly by staff/admin to
    // delivered), deduct now. Idempotent via confirmed_at.
    if (status === "delivered") {
      await deductStockForOrderIfNeeded(supabase, order_id, { notifyLowStock: true });
    }

    // Create earning when delivered — idempotent so a duplicate "delivered"
    // request (double-tap / retry) can never pay the rider twice.
    if (status === "delivered" && (order as any).rider_id) {
      const riderId = order.rider_id || user.id;
      const earningAmount = Number((order as any).rider_earnings) || 40;

      const { data: existingEarning } = await supabase
        .from("rider_earnings")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();

      if (!existingEarning) {
        const { error: earnError } = await createRiderEarning(supabase, riderId, order.id, earningAmount);
        if (earnError) {
          console.error("Failed to create rider earning:", earnError);
        }
      }

      // Notify customer
      if (order.user_id) {
        await createNotification(supabase, {
          user_id: order.user_id,
          type: "order_delivered",
          title: "Order Delivered",
          message: "Your order has been delivered. Enjoy!",
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
