import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";
import type { Profile } from "@repo/types";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type UserRole = Database["public"]["Enums"]["user_role"];

export async function getProfileById(supabase: TypedSupabaseClient, userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) return null;
  return data as Profile;
}

export { getProfileById as getProfile };

export async function getProfileRole(supabase: TypedSupabaseClient, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role, is_active, rider_status")
    .eq("id", userId)
    .single();
  return data;
}

export async function upsertProfile(supabase: TypedSupabaseClient, profile: ProfileInsert) {
  const { data, error } = await supabase.from("profiles").upsert(profile).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function updateProfile(supabase: TypedSupabaseClient, userId: string, updates: ProfileUpdate) {
  const updateData: ProfileUpdate = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function getRiders(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "rider")
    .order("created_at");
  if (error) return [];
  return (data as Profile[]) || [];
}

export async function updateRiderStatus(
  supabase: TypedSupabaseClient,
  riderId: string,
  status: "available" | "rejected",
  isActive: boolean,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ rider_status: status, is_active: isActive })
    .eq("id", riderId);
  return { error };
}

export async function getProfilesByRole(supabase: TypedSupabaseClient, role: UserRole) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", role)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data as Profile[]) || [];
}

export async function getAdminIds(supabase: TypedSupabaseClient) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "admin");
  return data || [];
}
