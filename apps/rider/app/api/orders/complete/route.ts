import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { order_id } = body;

  if (!order_id) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, rider_id, delivery_fee")
    .eq("id", order_id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "delivered",
      completed_at: new Date().toISOString(),
    })
    .eq("id", order_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (order.rider_id && order.delivery_fee) {
    await supabase.from("rider_earnings").insert({
      rider_id: order.rider_id,
      order_id: order.id,
      amount: order.delivery_fee,
      earned_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true });
}
