import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";

type CategoryInsert = Database["public"]["Tables"]["categories"]["Insert"];
type CategoryUpdate = Database["public"]["Tables"]["categories"]["Update"];

export async function getCategories(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function createCategory(
  supabase: TypedSupabaseClient,
  category: CategoryInsert,
) {
  const { data, error } = await supabase
    .from("categories")
    .insert(category)
    .select()
    .single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function updateCategory(
  supabase: TypedSupabaseClient,
  categoryId: string,
  updates: CategoryUpdate,
) {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", categoryId)
    .select()
    .single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function deleteCategory(supabase: TypedSupabaseClient, categoryId: string) {
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  return { error };
}

export async function getCategoryByName(supabase: TypedSupabaseClient, name: string) {
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("name", name)
    .single();
  return data;
}

export async function getCategoryMap(supabase: TypedSupabaseClient) {
  const { data: categories } = await supabase.from("categories").select("id, name");
  const map = new Map<string, string>();
  if (categories) {
    for (const cat of categories) map.set(cat.id, cat.name);
  }
  return map;
}
