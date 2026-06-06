import type { TypedSupabaseClient } from "./client";
import type { Profile } from "@repo/types";

export async function getUser(supabase: TypedSupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getProfile(supabase: TypedSupabaseClient, userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) return null;
  return data as Profile;
}

export async function requireAuth(supabase: TypedSupabaseClient) {
  const user = await getUser(supabase);
  if (!user) return null;
  return user;
}

export async function requireAdmin(serviceSupabase: TypedSupabaseClient, userId: string) {
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (profile?.role !== "admin") return false;
  return true;
}

export async function requireStaffOrAdmin(serviceSupabase: TypedSupabaseClient, userId: string) {
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .single();
  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) return null;
  if (profile.is_active === false) return null;
  return profile;
}
