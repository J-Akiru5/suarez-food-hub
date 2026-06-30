import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";

type BusinessInsert = Database["public"]["Tables"]["business"]["Insert"];
type BusinessUpdate = Database["public"]["Tables"]["business"]["Update"];

export async function getBusinessConfig(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase.from("business").select("*").limit(1).single();
  if (error) return null;
  return data;
}

export async function updateBusinessConfig(supabase: TypedSupabaseClient, businessId: string, updates: BusinessUpdate) {
  const updateData: BusinessUpdate = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("business").update(updateData).eq("id", businessId).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function createBusinessConfig(supabase: TypedSupabaseClient, config: BusinessInsert) {
  const { data, error } = await supabase.from("business").insert(config).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}
