import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export async function getProducts(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getProductsWithCategories(supabase: TypedSupabaseClient) {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];

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

  return (products || []).map((p: any) => ({
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
