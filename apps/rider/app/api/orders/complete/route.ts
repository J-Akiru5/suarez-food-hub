import { createServiceClient } from "@repo/data-access/client";
import { createRiderEarning } from "@repo/data-access/data/earnings";
import { createNotification } from "@repo/data-access/data/notifications";
import { getOrderById, updateOrderStatus } from "@repo/data-access/data/orders";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await getOrderById(supabase, order_id);

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.rider_id !== user.id) return NextResponse.json({ error: "Not your order" }, { status: 403 });
    if (order.status === "delivered") return NextResponse.json({ error: "Already delivered" }, { status: 400 });

    const { error: updateError } = await updateOrderStatus(supabase, order_id, "delivered", {
      delivered_at: new Date().toISOString(),
    });

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    if (order.rider_id && order.delivery_fee) {
      const earningAmount = Math.round(order.delivery_fee * 0.8 * 100) / 100;
      await createRiderEarning(supabase, order.rider_id, order.id, earningAmount);
    }

    if (order.user_id) {
      await createNotification(supabase, {
        user_id: order.user_id,
        type: "order_delivered",
        title: "Order Delivered",
        message: "Your order has been delivered. Enjoy!",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
