import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const serviceSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {}
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
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

    // Check stock for all items before creating order
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

    // Ensure profile exists
    const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", user.id).single();

    if (!existingProfile) {
      await serviceSupabase.from("profiles").insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Customer",
        phone: delivery_contact,
        address: delivery_address,
        role: "customer",
      });
    }

    // Create order
    const { data: order, error: orderError } = await serviceSupabase
      .from("orders")
      .insert([
        {
          user_id: user.id,
          status: "pending",
          payment_method: payment_method,
          payment_status: "pending",
          gcash_reference_no: payment_method === "gcash" ? gcash_reference || null : null,
          maya_reference_no: payment_method === "maya" ? maya_reference || null : null,
          delivery_address,
          delivery_contact,
          subtotal,
          delivery_fee,
          total,
        },
      ])
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Insert order items and deduct stock with rollback on failure
    let itemInsertFailed = false;
    for (const item of cart) {
      const { error: itemError } = await serviceSupabase.from("order_items").insert([
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

      const { data: currentProduct } = await serviceSupabase
        .from("products")
        .select("quantity, buffer_quantity, name")
        .eq("id", item.id)
        .single();

      if (currentProduct) {
        const newQuantity = currentProduct.quantity - item.quantity;
        const { error: updateError } = await serviceSupabase
          .from("products")
          .update({ quantity: newQuantity, availability: newQuantity <= 0 ? "sold_out" : "available" })
          .eq("id", item.id);

        if (updateError) {
          itemInsertFailed = true;
          break;
        }

        if (newQuantity <= (currentProduct.buffer_quantity ?? 5) && newQuantity >= 0) {
          const { data: admins } = await serviceSupabase.from("profiles").select("id").eq("role", "admin");
          if (admins && admins.length > 0) {
            await serviceSupabase.from("notifications").insert(
              admins.map((a) => ({
                user_id: a.id,
                type: "low_stock",
                title: "Low Stock Alert",
                message: `"${currentProduct.name}" is running low — only ${newQuantity} left (buffer: ${currentProduct.buffer_quantity ?? 5}).`,
                data: { product_id: item.id, remaining: newQuantity },
              })),
            );
            await serviceSupabase
              .from("products")
              .update({ low_stock_alerted_at: new Date().toISOString() })
              .eq("id", item.id);
          }
        }
      }
    }

    if (itemInsertFailed) {
      await serviceSupabase.from("orders").delete().eq("id", order.id);
      await serviceSupabase.from("order_items").delete().eq("order_id", order.id);
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
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {}
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = serviceSupabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
