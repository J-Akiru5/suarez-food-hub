import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authSupabase = createAuthClient(cookieStore);
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { order_id, rider_id, rating, comment } = body;

    if (!order_id || !rider_id || !rating) {
      return NextResponse.json({ success: false, error: "order_id, rider_id, and rating are required" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify the order belongs to this user and is delivered
    const { data: order } = await supabase
      .from("orders")
      .select("status, rider_id")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "delivered") {
      return NextResponse.json({ success: false, error: "Can only review delivered orders" }, { status: 400 });
    }

    // Check if already reviewed
    const { data: existing } = await supabase
      .from("rider_reviews")
      .select("id")
      .eq("order_id", order_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, error: "Already reviewed this order" }, { status: 400 });
    }

    const { error } = await supabase.from("rider_reviews").insert({
      order_id,
      rider_id,
      user_id: user.id,
      rating,
      comment: comment || null,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
