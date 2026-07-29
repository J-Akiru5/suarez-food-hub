import type { Database } from "@repo/data-access";
import { getUser } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { createOrder, createOrderItems, deleteOrder, getOrdersByUser } from "@repo/data-access/data/orders";
import { getProfileById, upsertProfile } from "@repo/data-access/data/profiles";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);

    const user = await getUser(authClient);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      cart,
      delivery_address,
      delivery_contact,
      payment_method,
      gcash_reference,
      subtotal,
      delivery_fee,
      total,
      delivery_lat,
      delivery_lng,
    } = body;

    if (!cart?.length || !delivery_address || !delivery_contact) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!["cod", "gcash"].includes(payment_method)) {
      return NextResponse.json({ success: false, error: "Invalid payment method" }, { status: 400 });
    }

    const stockErrors: string[] = [];
    for (const item of cart) {
      if (item.variantId) {
        // Check variant stock
        const { data: variant } = await serviceSupabase
          .from("product_variants")
          .select("name, quantity")
          .eq("id", item.variantId)
          .single();
        if (!variant) {
          stockErrors.push(`"${item.name}" variant not found`);
        } else if (variant.quantity < item.quantity) {
          stockErrors.push(
            `"${item.name} (${variant.name})" only has ${variant.quantity} left, you ordered ${item.quantity}`,
          );
        }
      } else {
        // Check product stock (no variant)
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
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({ success: false, error: "Insufficient stock", details: stockErrors }, { status: 409 });
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

    // Check delivery area restriction
    const { data: business } = await serviceSupabase.from("business").select("delivery_provinces").limit(1).single();

    if (business?.delivery_provinces) {
      const allowedProvinces = business.delivery_provinces.split(",").filter(Boolean);
      const profile = existingProfile || (await getProfileById(serviceSupabase, user.id));
      if (profile?.province_id && !allowedProvinces.includes(profile.province_id)) {
        return NextResponse.json(
          {
            success: false,
            error: "Delivery is not available in your area. We currently only deliver within select provinces.",
          },
          { status: 403 },
        );
      }
    }

    const { data: order, error: orderError } = await createOrder(serviceSupabase, {
      user_id: user.id,
      payment_method: payment_method,
      gcash_reference_no: payment_method === "gcash" ? gcash_reference || null : null,
      delivery_address,
      delivery_lat,
      delivery_lng,
      delivery_contact,
      subtotal,
      delivery_fee,
      total,
      rider_earnings: delivery_fee, // Rider earnings = delivery fee (auto-set from business config)
    });

    if (orderError) {
      return NextResponse.json({ success: false, error: orderError.message }, { status: 500 });
    }

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
        await deleteOrder(serviceSupabase, order.id);
        return NextResponse.json({ success: false, error: `Item error: ${itemError.message}` }, { status: 500 });
      }

      // ⚠️ Stock is NOT deducted on order placement.
      // Stock deduction happens when staff confirms the order (see apps/staff/app/api/orders/route.ts).
    }

    return NextResponse.json({ success: true, data: { orderId: order.id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);

    const user = await getUser(authClient);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as Database["public"]["Enums"]["order_status"] | null;

    const orders = await getOrdersByUser(serviceSupabase, user.id, status || undefined);
    return NextResponse.json({ success: true, data: orders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
