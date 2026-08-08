import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { getOrdersByPendingRiders } from "@repo/data-access/data/orders";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Invited riders are NOT yet the assigned rider (rider_id is NULL until they
// accept), so the RLS policy "riders read assigned orders" hides these orders
// from the rider's own client. Route this through the service client so the
// "Available Deliveries" broadcast works. Caller is verified as a rider below.
export async function GET() {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceClient();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "rider") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const orders = await getOrdersByPendingRiders(supabase, user.id);
    return NextResponse.json({ success: true, data: orders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
