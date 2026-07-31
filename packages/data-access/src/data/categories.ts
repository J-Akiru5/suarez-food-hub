import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";

type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export async function getCategories(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function createCategory(supabase: TypedSupabaseClient, category: CategoryInsert) {
  const { data, error } = await supabase.from("categories").insert(category).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function updateCategory(supabase: TypedSupabaseClient, categoryId: string, updates: CategoryUpdate) {
  const { data, error } = await supabase.from("categories").update(updates).eq("id", categoryId).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function deleteCategory(supabase: TypedSupabaseClient, categoryId: string) {
  // Soft-delete the category (RLS only allowed admin hard-deletes, and products
  // referencing the category blocked FK deletes). Staff can UPDATE categories,
  // so setting deleted_at + is_active=false works for everyone.
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: now, is_active: false })
    .eq("id", categoryId);
  if (error) return { error };
  // Cascade soft-delete the category's products so they disappear from the menu too,
  // and free each product's slug so a same-name product can be re-created later.
  const { data: products } = await supabase
    .from("products")
    .select("id, slug")
    .eq("category_id", categoryId)
    .is("deleted_at", null);
  if (products && products.length > 0) {
    for (const p of products) {
      await supabase
        .from("products")
        .update({
          availability: "sold_out",
          quantity: 0,
          slug: `deleted-${Date.now()}-${p.id.slice(0, 8)}`,
          deleted_at: now,
          updated_at: now,
        })
        .eq("id", p.id);
    }
  }
  // Category is already soft-deleted; product cascade failures shouldn't be fatal.
  return { error: null };
}

export async function getCategoryByName(supabase: TypedSupabaseClient, name: string) {
  const { data } = await supabase.from("categories").select("id").eq("name", name).is("deleted_at", null).single();
  return data;
}

export async function getCategoryMap(supabase: TypedSupabaseClient) {
  const { data: categories } = await supabase.from("categories").select("id, name").is("deleted_at", null);
  const map = new Map<string, string>();
  if (categories) {
    for (const cat of categories) map.set(cat.id, cat.name);
  }
  return map;
}
