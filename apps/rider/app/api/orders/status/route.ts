import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { getOrderById, updateOrderStatus } from "@repo/data-access/data/orders";
import { createRiderEarning } from "@repo/data-access/data/earnings";
import { createNotification } from "@repo/data-access/data/notifications";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Valid status transitions a rider can make
const RIDER_STATUS_FLOW: Record<string, string[]> = {
  ready_for_pickup: ["claimed_by_rider"],
  claimed_by_rider: ["out_for_delivery"],
  out_for_delivery: ["near_customer"],
  near_customer: ["delivered"],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, status } = body;

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
    if (order.rider_id !== user.id) return NextResponse.json({ success: false, error: "Not your order" }, { status: 403 });

    // Validate status transition
    const allowedNext = RIDER_STATUS_FLOW[order.status];
    if (!allowedNext || !allowedNext.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `Cannot transition from "${order.status}" to "${status}".`,
      }, { status: 400 });
    }

    // Build update payload with timestamp fields
    const extraFields: Record<string, string> = {};
    if (status === "claimed_by_rider") extraFields.picked_up_at = new Date().toISOString();
    if (status === "delivered") extraFields.delivered_at = new Date().toISOString();

    const { error: updateError } = await updateOrderStatus(supabase, order_id, status, extraFields);
    if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });

    // Create earning when delivered
    if (status === "delivered" && order.rider_id) {
      const earningAmount = Number(order.rider_earnings) || 40;
      const { error: earnError } = await createRiderEarning(supabase, order.rider_id, order.id, earningAmount);
      if (earnError) {
        console.error("Failed to create rider earning:", earnError);
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
