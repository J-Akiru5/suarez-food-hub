import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { product_id, order_id, rating, comment } = body;

    if (!product_id || !order_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Invalid review data" }, { status: 400 });
    }

    // Verify the order belongs to this user and is delivered
    const { data: order } = await supabase.from("orders").select("user_id, status").eq("id", order_id).single();

    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "delivered") {
      return NextResponse.json({ success: false, error: "Can only review delivered orders" }, { status: 400 });
    }

    // Check if already reviewed this product in this order
    const { data: existing } = await supabase
      .from("product_reviews")
      .select("id")
      .eq("product_id", product_id)
      .eq("order_id", order_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, error: "Already reviewed this product" }, { status: 409 });
    }

    // Create review using service client
    const serviceSupabase = createServiceClient();
    const { error } = await serviceSupabase.from("product_reviews").insert({
      id: crypto.randomUUID(),
      product_id,
      order_id,
      user_id: user.id,
      rating,
      comment: comment || null,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Update product rating
    const { data: allReviews } = await serviceSupabase
      .from("product_reviews")
      .select("rating")
      .eq("product_id", product_id);

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allReviews.length;
      await serviceSupabase
        .from("products")
        .update({ rating: Math.round(avg * 10) / 10 })
        .eq("id", product_id);
    }

    return NextResponse.json({ success: true, data: { message: "Product review submitted!" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    let query = supabase
      .from("product_reviews")
      .select("*, product:products!product_reviews_product_id_fkey(name, image_url)")
      .eq("user_id", user.id);

    if (orderId) {
      query = query.eq("order_id", orderId);
    }

    const { data } = await query.order("created_at", { ascending: false });
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
