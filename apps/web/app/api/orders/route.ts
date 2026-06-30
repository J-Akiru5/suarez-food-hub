import type { Database } from "@repo/data-access";
import { getUser } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { createNotifications } from "@repo/data-access/data/notifications";
import { createOrder, createOrderItems, deleteOrder, getOrdersByUser } from "@repo/data-access/data/orders";
import { deductStock, markLowStockAlerted } from "@repo/data-access/data/products";
import { getAdminIds, getProfileById, upsertProfile } from "@repo/data-access/data/profiles";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);

    const user = await getUser(authClient);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      cart,
      delivery_address,
      delivery_contact,
      payment_method,
      gcash_reference,
      maya_reference,
      subtotal,
      delivery_fee,
      total,
    } = body;

    if (!cart?.length || !delivery_address || !delivery_contact) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["cod", "gcash", "maya"].includes(payment_method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const stockErrors: string[] = [];
    for (const item of cart) {
      const { data: product } = await serviceSupabase
        .from("products")
        .select("name, quantity, buffer_quantity, availability")
        .eq("id", item.id)
        .single();

      if (!product) {
        stockErrors.push(`"${item.name}" not found`);
      } else if (product.quantity < item.quantity) {
        stockErrors.push(`"${product.name}" only has ${product.quantity} left, you ordered ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({ error: "Insufficient stock", details: stockErrors }, { status: 409 });
    }

    const existingProfile = await getProfileById(serviceSupabase, user.id);
    if (!existingProfile) {
      await upsertProfile(serviceSupabase, {
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer",
        phone: delivery_contact,
        address: delivery_address,
        role: "customer",
      });
    }

    const { data: order, error: orderError } = await createOrder(serviceSupabase, {
      user_id: user.id,
      payment_method: payment_method,
      gcash_reference_no: payment_method === "gcash" ? gcash_reference || null : null,
      maya_reference_no: payment_method === "maya" ? maya_reference || null : null,
      delivery_address,
      delivery_contact,
      subtotal,
      delivery_fee,
      total,
    });

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    let itemInsertFailed = false;
    for (const item of cart) {
      const { error: itemError } = await createOrderItems(serviceSupabase, [
        {
          order_id: order.id,
          product_id: item.id,
          product_name: item.name,
          variant_name: item.variant || null,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        },
      ]);

      if (itemError) {
        itemInsertFailed = true;
        break;
      }

      const result = await deductStock(serviceSupabase, item.id, item.quantity);
      if (result.error || result.newQuantity == null) {
        itemInsertFailed = true;
        break;
      }

      if (result.newQuantity <= (result.bufferQuantity ?? 5) && result.newQuantity >= 0) {
        const admins = await getAdminIds(serviceSupabase);
        if (admins && admins.length > 0) {
          await createNotifications(
            serviceSupabase,
            admins.map((a) => ({
              user_id: a.id,
              type: "low_stock",
              title: "Low Stock Alert",
              message: `"${result.name}" is running low \u2014 only ${result.newQuantity} left (buffer: ${result.bufferQuantity ?? 5}).`,
              data: { product_id: item.id, remaining: result.newQuantity },
            })),
          );
          await markLowStockAlerted(serviceSupabase, item.id);
        }
      }
    }

    if (itemInsertFailed) {
      await deleteOrder(serviceSupabase, order.id);
      return NextResponse.json({ error: "Failed to process order items. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);

    const user = await getUser(authClient);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as Database["public"]["Enums"]["order_status"] | null;

    const orders = await getOrdersByUser(serviceSupabase, user.id, status || undefined);
    return NextResponse.json(orders);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
