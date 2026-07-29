import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { createNotifications } from "@repo/data-access/data/notifications";
import { updateOrderStatus } from "@repo/data-access/data/orders";
import { deductStock, deductVariantStock, markLowStockAlerted } from "@repo/data-access/data/products";
import { getAdminIds, getProfileRole } from "@repo/data-access/data/profiles";
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

    const timestampPatch: Record<string, string> = {};
    if (status === "confirmed") timestampPatch.confirmed_at = new Date().toISOString();
    if (status === "preparing") timestampPatch.prepared_at = new Date().toISOString();
    if (status === "cancelled") timestampPatch.cancelled_at = new Date().toISOString();

    const { error } = await updateOrderStatus(supabase, order_id, status, {
      ...timestampPatch,
      staff_id: user.id,
    });

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    // 🔁 Deduct stock when order is confirmed (not when placed)
    if (status === "confirmed") {
      const serviceSupabase = createServiceClient();

      // Fetch order items to know what stock to deduct
      const { data: items } = await serviceSupabase
        .from("order_items")
        .select("*, product:products!order_items_product_id_fkey(name, buffer_quantity)")
        .eq("order_id", order_id);

      if (items && items.length > 0) {
        for (const item of items) {
          if (item.variant_name) {
            // Find the matching variant and deduct
            const { data: variants } = await serviceSupabase
              .from("product_variants")
              .select("id, name, quantity")
              .eq("product_id", item.product_id);

            if (variants && variants.length > 0) {
              const match = variants.find((v: { name: string; id: string }) => v.name === item.variant_name);
              if (match) {
                await deductVariantStock(serviceSupabase, match.id, item.quantity);
              }
            }
          } else {
            const result = await deductStock(serviceSupabase, item.product_id, item.quantity);
            if (result && !result.error && result.newQuantity != null) {
              // Check low stock alert
              const productInfo = item.product as { buffer_quantity?: number; name?: string } | null;
              const bufferQty = productInfo?.buffer_quantity ?? 5;
              const productName = productInfo?.name || "Product";
              if (result.newQuantity <= bufferQty && result.newQuantity >= 0) {
                const admins = await getAdminIds(serviceSupabase);
                if (admins && admins.length > 0) {
                  await createNotifications(
                    serviceSupabase,
                    admins.map((a: { id: string }) => ({
                      id: crypto.randomUUID(),
                      user_id: a.id,
                      type: "low_stock",
                      title: "Low Stock Alert",
                      message: `"${productName}" is running low — only ${result.newQuantity} left (buffer: ${bufferQty}).`,
                      data: { product_id: item.product_id, remaining: result.newQuantity },
                    })),
                  );
                  await markLowStockAlerted(serviceSupabase, item.product_id);
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
