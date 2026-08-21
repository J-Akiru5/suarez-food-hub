import type { Database } from "@repo/data-access";
import { getUser } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { createOrder, createOrderItems, deleteOrder, getOrdersByUser } from "@repo/data-access/data/orders";
import { getProfileById, isUsernameTaken, upsertProfile } from "@repo/data-access/data/profiles";
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
      payment_proof_url,
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
        // Check variant stock + verify the parent product still exists
        // (prevents an FK error on order_items insert when a product was hard-deleted)
        const { data: variant } = await serviceSupabase
          .from("product_variants")
          .select("name, quantity, product_id")
          .eq("id", item.variantId)
          .single();
        if (!variant) {
          stockErrors.push(`"${item.name}" variant not found`);
        } else {
          const { data: variantProduct } = await serviceSupabase
            .from("products")
            .select("id")
            .eq("id", variant.product_id)
            .maybeSingle();
          if (!variantProduct) {
            stockErrors.push(`"${item.name}" is no longer available`);
          } else if (variant.quantity < item.quantity) {
            stockErrors.push(
              `"${item.name} (${variant.name})" only has ${variant.quantity} left, you ordered ${item.quantity}`,
            );
          }
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
      // Auto-create a missing profile. Must send a COMPLETE payload — the live
      // profiles table has NOT NULL created_at/updated_at, so the old partial
      // upsert failed silently and the order insert then violated the
      // orders_user_id_fkey constraint.
      const now = new Date().toISOString();
      const firstName = user.user_metadata?.first_name || "";
      const lastName = user.user_metadata?.last_name || "";
      const fullName =
        user.user_metadata?.full_name || `${firstName} ${lastName}`.trim() || user.email?.split("@")[0] || "Customer";

      // username is unique — derive one from the email prefix and disambiguate if taken
      const baseUsername =
        (user.email?.split("@")[0] || "customer").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "customer";
      let username = baseUsername;
      let suffix = 1;
      while (await isUsernameTaken(serviceSupabase, username)) {
        username = `${baseUsername.slice(0, 17)}${suffix}`;
        suffix += 1;
      }

      const { error: profileError } = await upsertProfile(serviceSupabase, {
        id: user.id,
        email: user.email,
        username,
        full_name: fullName,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: delivery_contact,
        address: delivery_address,
        role: "customer",
        is_active: true,
        created_at: now,
        updated_at: now,
      });
      if (profileError) {
        return NextResponse.json(
          { success: false, error: `Failed to create your profile: ${profileError.message}` },
          { status: 500 },
        );
      }
    }

    // Check delivery area restriction — town/city level (Iloilo City + selected towns),
    // with province-level fallback for backwards compatibility.
    const { data: business } = await serviceSupabase
      .from("business")
      .select("delivery_provinces, delivery_areas")
      .limit(1)
      .single();

    const profile = existingProfile || (await getProfileById(serviceSupabase, user.id));

    // Block deleted/deactivated accounts from placing orders (session may still be valid)
    if (profile && profile.is_active === false) {
      return NextResponse.json({ success: false, error: "Your account has been deactivated." }, { status: 403 });
    }

    if (business?.delivery_areas) {
      const allowedAreas = business.delivery_areas.split(",").filter(Boolean);
      if (allowedAreas.length > 0) {
        // No saved address at all — the customer must set one up first.
        if (!profile?.town_id) {
          return NextResponse.json(
            {
              success: false,
              error: "Please set up your delivery address in My Profile before placing an order.",
            },
            { status: 403 },
          );
        }
        if (!allowedAreas.includes(profile.town_id)) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Delivery is not available in your area. We currently only deliver within Iloilo City and selected towns in Iloilo.",
            },
            { status: 403 },
          );
        }
      }
    } else if (business?.delivery_provinces) {
      const allowedProvinces = business.delivery_provinces.split(",").filter(Boolean);
      if (allowedProvinces.length > 0 && !profile?.province_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Please set up your delivery address in My Profile before placing an order.",
          },
          { status: 403 },
        );
      }
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
      payment_proof_url: payment_method === "gcash" ? payment_proof_url || null : null,
      delivery_address,
      delivery_lat,
      delivery_lng,
      delivery_contact,
      subtotal,
      delivery_fee,
      total,
      // Rider earnings = the product price (subtotal). The customer pays
      // the full product price and the rider earns that amount for delivery.
      rider_earnings: subtotal,
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
