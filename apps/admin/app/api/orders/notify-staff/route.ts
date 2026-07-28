import { createServiceClient } from "@repo/data-access/client";
import { createNotifications } from "@repo/data-access/data/notifications";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    const { order_id, order_number } = await req.json();

    if (!order_id || !order_number) {
      return NextResponse.json({ success: false, error: "Missing order_id or order_number" }, { status: 400 });
    }

    // Find all staff users
    const { data: staffUsers } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("role", "staff")
      .eq("is_active", true);

    if (staffUsers && staffUsers.length > 0) {
      await createNotifications(
        serviceSupabase,
        staffUsers.map((s) => ({
          user_id: s.id,
          type: "new_order",
          title: "New Order Confirmed",
          message: `Order #${order_number.slice(0, 8).toUpperCase()} has been confirmed and is ready for preparation.`,
          data: { order_id },
        })),
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
