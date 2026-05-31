import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@repo/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("orders")
    .select(
      "*, profile:profiles!orders_user_id_fkey(first_name, last_name, phone, address), rider:profiles!orders_rider_id_fkey(first_name, last_name), items:order_items(quantity, unit_price, total_price, product:products!order_items_product_id_fkey(name))"
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00`);
  }

  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data,
    count,
    limit,
    offset,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { id, status, rider_id } = body;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Order ID is required" },
      { status: 400 }
    );
  }

  const updates: Record<string, any> = {};
  if (status) updates.status = status;
  if (rider_id !== undefined) updates.rider_id = rider_id;

  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
