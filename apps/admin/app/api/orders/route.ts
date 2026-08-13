import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { createNotifications } from "@repo/data-access/data/notifications";
import { getOrdersWithProfiles, updateOrderStatus } from "@repo/data-access/data/orders";
import { deductStockForOrderIfNeeded, restoreStock, restoreVariantStock } from "@repo/data-access/data/products";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const _dateFrom = searchParams.get("from");
    const _dateTo = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const data = await getOrdersWithProfiles(supabase, {
      status: status !== "all" ? (status ?? undefined) : undefined,
    });

    return NextResponse.json({ success: true, data, count: data.length, limit, offset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { id, status, rider_id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceClient();

    // Fetch current order state so stock handling stays idempotent — the same
    // confirmed_at guard used by the staff route (admin confirming an order must
    // deduct stock too, and cancelling a confirmed order must restore it).
    const { data: existingOrder } = await serviceSupabase
      .from("orders")
      .select("status, confirmed_at")
      .eq("id", id)
      .single();
    if (!existingOrder) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    const prevStatus = existingOrder.status;

    const extraFields: Record<string, any> = {};
    if (rider_id !== undefined) extraFields.rider_id = rider_id;
    if (status) {
      // NOTE: confirmed_at is NOT stamped here for "confirmed" — the stock
      // helper stamps it as the "stock deducted" marker (see below).
      if (status === "cancelled") {
        extraFields.cancelled_at = new Date().toISOString();
        // Stock is restored on cancel, so a future re-confirm must deduct again.
        extraFields.confirmed_at = null;
      }
    }

    const { error } = await updateOrderStatus(supabase, id, status || "pending", extraFields);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Deduct stock when entering ANY fulfillment status (confirmed, preparing,
    // ready_for_pickup, ...) and stock hasn't been deducted yet. The shared
    // helper is keyed on confirmed_at so it never double-deducts, and it works
    // even when admin sets "delivered" directly on an order staff never
    // confirmed (the case the client reported: stock not dropping on delivery).
    const shouldDeductStock =
      [
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "claimed_by_rider",
        "out_for_delivery",
        "near_customer",
        "delivered",
      ].includes(status) && !existingOrder.confirmed_at;
    if (shouldDeductStock) {
      const { error: deductError } = await deductStockForOrderIfNeeded(serviceSupabase, id);
      if (deductError) {
        return NextResponse.json(
          { success: false, error: deductError.message || "Failed to deduct stock" },
          { status: 500 },
        );
      }

      // Notify staff that the order was confirmed (admin-confirm flow)
      const { data: staffUsers, error: staffFetchErr } = await serviceSupabase
        .from("profiles")
        .select("id")
        .eq("role", "staff")
        .eq("is_active", true);
      if (!staffFetchErr && staffUsers && staffUsers.length > 0) {
        const { data: orderRow } = await serviceSupabase.from("orders").select("order_number").eq("id", id).single();
        const orderNumber = orderRow?.order_number || id;
        await createNotifications(
          serviceSupabase,
          staffUsers.map((s) => ({
            id: crypto.randomUUID(),
            user_id: s.id,
            type: "new_order",
            title: "New Order Confirmed",
            message: `Order #${orderNumber.slice(0, 8).toUpperCase()} has been confirmed and is ready for preparation.`,
            data: { order_id: id },
          })),
        );
      }
    }

    // Restore stock when cancelling an order that already had stock deducted
    // (confirmed or later). Keyed on confirmed_at read before it was cleared.
    const wasStockDeducted = !!existingOrder.confirmed_at && prevStatus !== "delivered";
    if (status === "cancelled" && wasStockDeducted) {
      const { data: items } = await serviceSupabase.from("order_items").select("*").eq("order_id", id);
      let restoreError: { message?: string } | null = null;
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.variant_name) {
            const { data: variants } = await serviceSupabase
              .from("product_variants")
              .select("id, name")
              .eq("product_id", item.product_id);
            const match = (variants || []).find((v: { name: string; id: string }) => v.name === item.variant_name);
            if (match) {
              const { error: rErr } = await restoreVariantStock(serviceSupabase, match.id, item.quantity);
              if (rErr) restoreError = rErr;
            }
          } else {
            const { error: rErr } = await restoreStock(serviceSupabase, item.product_id, item.quantity);
            if (rErr) restoreError = rErr;
          }
        }
      }
      if (restoreError) {
        return NextResponse.json(
          { success: false, error: restoreError.message || "Failed to restore stock" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, data: { id, status, rider_id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
