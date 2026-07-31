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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { data: order, error: fetchError } = await serviceSupabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Customers may ONLY cancel their own pending COD orders.
    // Stock is only deducted when staff confirms an order, so a pending order has
    // no stock to restore — never touch stock here (prevents stock inflation).
    if (body.status !== "cancelled") {
      return NextResponse.json({ success: false, error: "Customers can only cancel orders" }, { status: 400 });
    }
    if (order.status !== "pending") {
      return NextResponse.json({ success: false, error: "Only pending orders can be cancelled" }, { status: 400 });
    }
    if (order.payment_method !== "cod") {
      return NextResponse.json(
        { success: false, error: "Only Cash on Delivery orders can be cancelled" },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await serviceSupabase
      .from("orders")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    // Notify staff/admin so the kitchen knows the customer cancelled
    const { data: staffProfiles } = await serviceSupabase.from("profiles").select("id").in("role", ["admin", "staff"]);
    if (staffProfiles && staffProfiles.length > 0) {
      await serviceSupabase.from("notifications").insert(
        staffProfiles.map((s) => ({
          user_id: s.id,
          type: "order_cancelled",
          title: "Order Cancelled by Customer",
          message: `Customer cancelled order #${id.slice(0, 8)}.`,
          data: { order_id: id },
        })),
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
