import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { updateOrderStatus } from "@repo/data-access/data/orders";
import { deductStockForOrderIfNeeded, restoreStock, restoreVariantStock } from "@repo/data-access/data/products";
import { getProfileRole } from "@repo/data-access/data/profiles";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const profile = await getProfileRole(supabase, user.id);

    if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (profile.is_active === false) {
      return NextResponse.json({ success: false, error: "Account inactive" }, { status: 403 });
    }

    const body = await request.json();
    const { order_id, status } = body;

    if (!order_id || !status) {
      return NextResponse.json({ success: false, error: "order_id and status required" }, { status: 400 });
    }

    const allowedStatuses = ["confirmed", "preparing", "ready_for_pickup", "cancelled"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Staff cannot set this status" }, { status: 403 });
    }

    // Fetch the order's current status + confirmation state so stock handling is
    // idempotent and correct even when staff skips straight to "preparing".
    const serviceSupabase = createServiceClient();
    const { data: existingOrder } = await serviceSupabase
      .from("orders")
      .select("status, confirmed_at")
      .eq("id", order_id)
      .single();
    const prevStatus = existingOrder?.status;
    if (!existingOrder) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const timestampPatch: Record<string, string | null> = {};
    // NOTE: confirmed_at is intentionally NOT set here for "confirmed" — the
    // stock-deduction helper stamps it (it doubles as the "stock deducted"
    // marker). If it were set by the update below, the helper's re-read would
    // see it already set and skip deduction entirely.
    if (status === "preparing") timestampPatch.prepared_at = new Date().toISOString();
    if (status === "cancelled") {
      timestampPatch.cancelled_at = new Date().toISOString();
      // Stock is restored on cancel, so a future re-confirm must deduct again.
      // (The full history is preserved in order_status_log.)
      timestampPatch.confirmed_at = null;
    }

    const { error } = await updateOrderStatus(supabase, order_id, status, {
      ...timestampPatch,
      staff_id: user.id,
    });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    // 🔁 Deduct stock when the order enters a fulfillment status (confirmed,
    // preparing, ready_for_pickup) and stock has not been deducted yet. The
    // shared helper is keyed on confirmed_at, so it never double-deducts — even
    // if staff jumps straight from pending to preparing/ready, or re-confirms.
    const shouldDeductStock =
      ["confirmed", "preparing", "ready_for_pickup"].includes(status) && !existingOrder.confirmed_at;
    if (shouldDeductStock) {
      const { error: deductError } = await deductStockForOrderIfNeeded(serviceSupabase, order_id);
      if (deductError) {
        return NextResponse.json(
          { success: false, error: deductError.message || "Failed to deduct stock" },
          { status: 500 },
        );
      }
    }

    // 🔁 Restore stock when staff cancels an order that already had stock deducted.
    // Keyed on confirmed_at (read BEFORE the update clears it) for symmetry with
    // shouldDeductStock — so pending→preparing→cancelled (stock never deducted)
    // never restores, while any confirmed lineage does. Delivered is excluded:
    // its stock was consumed by the customer (UI prevents this, guard is for API).
    const wasStockDeducted = !!existingOrder.confirmed_at && prevStatus !== "delivered";
    if (status === "cancelled" && wasStockDeducted) {
      const { data: items } = await serviceSupabase.from("order_items").select("*").eq("order_id", order_id);
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
              const { error } = await restoreVariantStock(serviceSupabase, match.id, item.quantity);
              if (error) restoreError = error;
            }
          } else {
            const { error } = await restoreStock(serviceSupabase, item.product_id, item.quantity);
            if (error) restoreError = error;
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

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
