import type { TypedSupabaseClient } from "../client";
import type { Json } from "../types";

export async function getCart(supabase: TypedSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_carts")
    .select("items")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") return { items: [] as Json, error };
  return { items: (data?.items as Json) || ([] as Json), error: null };
}

export async function upsertCart(supabase: TypedSupabaseClient, userId: string, items: Json) {
  const { error } = await supabase
    .from("user_carts")
    .upsert({ user_id: userId, items, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return { error };
}

export async function deleteCart(supabase: TypedSupabaseClient, userId: string) {
  const { error } = await supabase.from("user_carts").delete().eq("user_id", userId);
  return { error };
}
