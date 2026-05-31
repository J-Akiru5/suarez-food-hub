import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@repo/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    items,
    delivery_address,
    delivery_instructions,
    payment_method,
    gcash_reference,
    gcash_proof_url,
  } = body;

  if (!items?.length || !delivery_address || !payment_method) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const { data: product } = await supabase
      .from("products")
      .select("price")
      .eq("id", item.product_id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: `Product not found: ${item.product_id}` },
        { status: 400 }
      );
    }

    let unitPrice = product.price;

    if (item.product_variant_id) {
      const { data: variant } = await supabase
        .from("product_variants")
        .select("price_adjustment")
        .eq("id", item.product_variant_id)
        .single();

      if (variant) {
        unitPrice += variant.price_adjustment;
      }
    }

    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    orderItems.push({
      product_id: item.product_id,
      product_variant_id: item.product_variant_id || null,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      special_instructions: item.special_instructions || null,
    });
  }

  const deliveryFee = 49;
  const total = subtotal + deliveryFee;

  const now = new Date();
  const orderNumber = `SFH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      order_number: orderNumber,
      status: "pending",
      payment_method,
      payment_status: payment_method === "gcash" ? "paid" : "pending",
      subtotal,
      delivery_fee: deliveryFee,
      total,
      delivery_address,
      delivery_instructions: delivery_instructions || null,
      gcash_reference: gcash_reference || null,
      gcash_proof_url: gcash_proof_url || null,
    })
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // Insert order items
  const itemsWithOrderId = orderItems.map((item) => ({
    ...item,
    order_id: order.id,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsWithOrderId);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Decrement stock
  for (const item of items) {
    await supabase.rpc("decrement_stock", {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });
  }

  return NextResponse.json({ data: order }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: orders });
}
