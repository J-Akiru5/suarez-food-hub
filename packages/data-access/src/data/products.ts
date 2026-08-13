import type { Product } from "@repo/types";
import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export async function getProducts(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  // sort_order was added by migration 0020 — the live DB may not have it yet
  // (the client applies migrations manually). Fall back to created_at ordering
  // so the menu/inventory never break in the meantime.
  if (error) {
    const { data: fallback, error: err2 } = await supabase
      .from("products")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (err2) return [];
    return fallback || [];
  }
  return data || [];
}

export async function getProductsWithCategories(supabase: TypedSupabaseClient) {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  // Fall back to created_at if sort_order doesn't exist yet (migration 0020 pending).
  let productList = products;
  if (error) {
    const { data: fallback, error: err2 } = await supabase
      .from("products")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (err2) return [];
    productList = fallback;
  }

  const { data: categories } = await supabase.from("categories").select("*").is("deleted_at", null);
  const categoryMap = new Map<string, string>();
  if (categories) {
    for (const cat of categories) categoryMap.set(cat.id, cat.name);
  }

  const { data: variants } = await supabase.from("product_variants").select("*");
  const variantMap = new Map<string, any[]>();
  if (variants) {
    for (const v of variants) {
      const e = variantMap.get(v.product_id) || [];
      e.push(v);
      variantMap.set(v.product_id, e);
    }
  }

  return (productList || []).map((p: any) => ({
    ...p,
    category_name: categoryMap.get(p.category_id) || "",
    variants: variantMap.get(p.id) || [],
  }));
}

export async function createProduct(supabase: TypedSupabaseClient, product: ProductInsert) {
  const insertPayload = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...product,
  } as ProductInsert;
  const { data, error } = await supabase.from("products").insert(insertPayload).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function updateProduct(supabase: TypedSupabaseClient, productId: string, updates: ProductUpdate) {
  const updatePayload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("products").update(updatePayload).eq("id", productId).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function deleteProduct(supabase: TypedSupabaseClient, productId: string) {
  // Soft-delete: mark as sold_out, zero out stock, and set deleted_at timestamp
  // instead of hard-deleting, because existing orders reference the product via foreign key.
  // Also free up the unique slug so a new product with the same name/slug can be created
  // (previously the stale slug caused "duplicate key value violates unique constraint").
  const freedSlug = `deleted-${Date.now()}-${productId.slice(0, 8)}`;
  const { error } = await supabase
    .from("products")
    .update({
      availability: "sold_out",
      quantity: 0,
      slug: freedSlug,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  return { error };
}

/**
 * Move a product up/down WITHIN ITS OWN CATEGORY (never crosses category
 * boundaries). After the move, every product in the list gets a fresh,
 * distinct sort_order equal to its display position — a plain value swap is
 * not enough because products start at sort_order = 0 (migration 0020
 * default), so swapping 0 <-> 0 would change nothing. Distinct values also
 * keep the customer menu order deterministic (ties were broken only by
 * created_at).
 */
export async function moveProduct(
  supabase: TypedSupabaseClient,
  productId: string,
  direction: "up" | "down",
  products: (Product & { category_id: string | null; sort_order: number })[] = [],
) {
  const idx = products.findIndex((p) => p.id === productId);
  if (idx === -1) return { error: new Error("Product not found") };
  const current = products[idx];

  // The inventory list is flat (ordered by sort_order/created_at), so the
  // nearest product of the SAME category is not necessarily the row directly
  // above/below — scan for it and skip products from other categories.
  let otherIdx = -1;
  if (direction === "up") {
    for (let i = idx - 1; i >= 0; i--) {
      if (products[i].category_id === current.category_id) {
        otherIdx = i;
        break;
      }
    }
  } else {
    for (let i = idx + 1; i < products.length; i++) {
      if (products[i].category_id === current.category_id) {
        otherIdx = i;
        break;
      }
    }
  }
  if (otherIdx === -1) return { error: null }; // already first/last in its category

  // Swap the two display positions, then reassign sort_order = display index
  // for the whole list so every product gets a distinct value.
  const reordered = [...products];
  [reordered[idx], reordered[otherIdx]] = [reordered[otherIdx], reordered[idx]];

  for (let pos = 0; pos < reordered.length; pos++) {
    const { id } = reordered[pos];
    const { error } = await supabase
      .from("products")
      .update({ sort_order: pos, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error };
  }
  return { error: null };
}

export async function generateUniqueSlug(supabase: TypedSupabaseClient, baseSlug: string, excludeId?: string) {
  // Ensure a slug doesn't collide with an existing (or soft-deleted) product.
  // This prevents the "duplicate key value violates unique constraint products_slug_key"
  // error when re-creating a product that was previously soft-deleted.
  let slug = baseSlug;
  let counter = 2;
  for (;;) {
    const query = supabase.from("products").select("id").eq("slug", slug).maybeSingle();
    const { data } = await query;
    if (!data || (excludeId && data.id === excludeId)) return slug;
    slug = `${baseSlug}-${counter++}`;
  }
}

export async function getProductById(supabase: TypedSupabaseClient, productId: string) {
  const { data, error } = await supabase.from("products").select("*").eq("id", productId).single();
  if (error) return null;
  return data;
}

export async function deductStock(supabase: TypedSupabaseClient, productId: string, quantity: number) {
  const { data: product } = await supabase
    .from("products")
    .select("quantity, buffer_quantity, name")
    .eq("id", productId)
    .single();

  if (!product) return { error: new Error("Product not found") };

  // Clamp at 0 so concurrent confirms can never drive stock negative
  const newQuantity = Math.max(0, product.quantity - quantity);
  const { error } = await supabase
    .from("products")
    .update({
      quantity: newQuantity,
      availability: newQuantity <= 0 ? "sold_out" : "available",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  return { error, newQuantity, bufferQuantity: product.buffer_quantity, name: product.name };
}

export async function deductVariantStock(supabase: TypedSupabaseClient, variantId: string, quantity: number) {
  const { data: variant } = await supabase
    .from("product_variants")
    .select("product_id, quantity, name")
    .eq("id", variantId)
    .single();

  if (!variant) return { error: new Error("Variant not found") };

  const newQuantity = Math.max(0, variant.quantity - quantity);
  const { error } = await supabase.from("product_variants").update({ quantity: newQuantity }).eq("id", variantId);

  return { error, newQuantity, name: variant.name, productId: variant.product_id };
}

/**
 * Restore stock for a product (used when a confirmed order is cancelled).
 * Only restore up to the quantity that was deducted.
 */
export async function restoreStock(supabase: TypedSupabaseClient, productId: string, quantity: number) {
  const { data: product } = await supabase.from("products").select("quantity").eq("id", productId).single();
  if (!product) return { error: new Error("Product not found") };

  const newQuantity = product.quantity + quantity;
  const { error } = await supabase
    .from("products")
    .update({
      quantity: newQuantity,
      availability: newQuantity > 0 ? "available" : "sold_out",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  return { error, newQuantity };
}

/**
 * Restore stock for a variant (used when a confirmed order is cancelled).
 */
export async function restoreVariantStock(supabase: TypedSupabaseClient, variantId: string, quantity: number) {
  const { data: variant } = await supabase.from("product_variants").select("quantity").eq("id", variantId).single();
  if (!variant) return { error: new Error("Variant not found") };

  const newQuantity = variant.quantity + quantity;
  const { error } = await supabase.from("product_variants").update({ quantity: newQuantity }).eq("id", variantId);

  return { error, newQuantity };
}

export async function markLowStockAlerted(supabase: TypedSupabaseClient, productId: string) {
  await supabase.from("products").update({ low_stock_alerted_at: new Date().toISOString() }).eq("id", productId);
}

/**
 * Deduct stock for an order IF it hasn't been deducted yet.
 *
 * Keyed on `orders.confirmed_at`: the moment stock is deducted we stamp
 * confirmed_at (which the status routes already use as the "stock handled"
 * marker). This is safe to call from ANY fulfillment transition — staff
 * confirm, staff jump straight to preparing/ready, or a rider accepting
 * directly from a pending order (broadcast model) — without ever
 * double-deducting.
 */
export async function deductStockForOrderIfNeeded(
  supabase: TypedSupabaseClient,
  orderId: string,
  options?: { notifyLowStock?: boolean },
) {
  const { data: existingOrder } = await supabase.from("orders").select("confirmed_at").eq("id", orderId).single();
  if (!existingOrder) return { skipped: true, error: new Error("Order not found") };
  // Already deducted (staff confirmed earlier, or this route already ran).
  if (existingOrder.confirmed_at) return { skipped: true };

  const { data: items } = await supabase
    .from("order_items")
    .select("*, product:products!order_items_product_id_fkey(name, buffer_quantity)")
    .eq("order_id", orderId);

  let deductError: { message?: string } | null = null;
  if (items && items.length > 0) {
    for (const item of items) {
      if (item.variant_name) {
        const { data: variants } = await supabase
          .from("product_variants")
          .select("id, name, quantity")
          .eq("product_id", item.product_id);
        const match = (variants || []).find((v: { name: string; id: string }) => v.name === item.variant_name);
        if (match) {
          const { error } = await deductVariantStock(supabase, match.id, item.quantity);
          if (error && !deductError) deductError = error;
        }
      } else {
        const result = await deductStock(supabase, item.product_id, item.quantity);
        if (result && !result.error && result.newQuantity != null && options?.notifyLowStock !== false) {
          const productInfo = item.product as { buffer_quantity?: number; name?: string } | null;
          const bufferQty = productInfo?.buffer_quantity ?? 5;
          const productName = productInfo?.name || "Product";
          if (result.newQuantity <= bufferQty && result.newQuantity >= 0) {
            const { data: staffProfiles } = await supabase.from("profiles").select("id").in("role", ["admin", "staff"]);
            if (staffProfiles && staffProfiles.length > 0) {
              const { createNotifications } = await import("./notifications");
              await createNotifications(
                supabase,
                staffProfiles.map((a: { id: string }) => ({
                  id: crypto.randomUUID(),
                  user_id: a.id,
                  type: "low_stock",
                  title: "Low Stock Alert",
                  message: `"${productName}" is running low — only ${result.newQuantity} left (buffer: ${bufferQty}).`,
                  data: { product_id: item.product_id, remaining: result.newQuantity },
                })),
              );
              await markLowStockAlerted(supabase, item.product_id);
            }
          }
        }
        if (result?.error && !deductError) deductError = result.error;
      }
    }
  }

  // Stamp confirmed_at as the "stock deducted" marker — but ONLY if we're the
  // ones deducting. If a deduction error occurred, don't mark it.
  if (!deductError) {
    await supabase.from("orders").update({ confirmed_at: new Date().toISOString() }).eq("id", orderId);
  }

  return { skipped: false, error: deductError };
}
