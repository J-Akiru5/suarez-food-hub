import { getUser } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const serviceSupabase = createServiceClient();
    const { id } = await params;
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);

    const user = await getUser(authClient);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { data: order, error: fetchError } = await serviceSupabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (body.status === "cancelled" && order.status !== "pending") {
      return NextResponse.json({ error: "Only pending orders can be cancelled" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await serviceSupabase
      .from("orders")
      .update({ status: body.status })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (body.status === "cancelled" && order.order_items) {
      for (const item of order.order_items) {
        const { data: product } = await serviceSupabase
          .from("products")
          .select("quantity")
          .eq("id", item.product_id)
          .single();

        if (product) {
          await serviceSupabase
            .from("products")
            .update({ quantity: product.quantity + item.quantity, availability: "available" })
            .eq("id", item.product_id);
        }
      }
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
