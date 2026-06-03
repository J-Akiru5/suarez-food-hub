import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: "order_id required" }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, rider_id, user_id, delivery_fee, status")
      .eq("id", order_id)
      .single();

    if (fetchError || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.rider_id !== user.id) return NextResponse.json({ error: "Not your order" }, { status: 403 });
    if (order.status === "delivered") return NextResponse.json({ error: "Already delivered" }, { status: 400 });

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", order_id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    if (order.rider_id && order.delivery_fee) {
      const earningAmount = Math.round(order.delivery_fee * 0.8 * 100) / 100;
      await supabase.from("rider_earnings").insert({
        rider_id: order.rider_id,
        order_id: order.id,
        amount: earningAmount,
        status: "pending",
      });
    }

    if (order.user_id) {
      await supabase.from("notifications").insert({
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
