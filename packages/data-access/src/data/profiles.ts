import type { Profile } from "@repo/types";
import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";

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
  const { data } = await supabase.from("profiles").select("role, is_active, rider_status").eq("id", userId).single();
  return data;
}

export async function upsertProfile(supabase: TypedSupabaseClient, profile: ProfileInsert) {
  const { data, error } = await supabase.from("profiles").upsert(profile).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function updateProfile(supabase: TypedSupabaseClient, userId: string, updates: ProfileUpdate) {
  const updateData: ProfileUpdate = { ...updates, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("profiles").update(updateData).eq("id", userId).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function getRiders(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase.from("profiles").select("*").eq("role", "rider").order("created_at");
  if (error) {
    console.error("Error fetching riders:", error);
    return [];
  }
  return (data as Profile[]) || [];
}

export async function getAvailableRiders(supabase: TypedSupabaseClient, includeRiderIds?: string | string[]) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "rider")
    .eq("is_active", true)
    .in("rider_status", ["available", "vacant"])
    .order("created_at");
  if (error) {
    console.error("Error fetching available riders:", error);
    return [];
  }

  const riders = (data as Profile[]) || [];

  // Collect IDs to always include (e.g., currently assigned but now occupied)
  const idsToInclude = Array.isArray(includeRiderIds) ? includeRiderIds : includeRiderIds ? [includeRiderIds] : [];
  const missingIds = idsToInclude.filter((id) => id && !riders.find((r) => r.id === id));

  if (missingIds.length > 0) {
    const { data: currentRiders } = await supabase.from("profiles").select("*").in("id", missingIds);
    if (currentRiders) {
      for (const rider of currentRiders) {
        if (!riders.find((r) => r.id === rider.id)) {
          riders.push(rider as Profile);
        }
      }
    }
  }

  return riders;
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
  if (error) {
    console.error("Error fetching profiles by role:", error);
    return [];
  }
  return (data as Profile[]) || [];
}

export async function getAdminIds(supabase: TypedSupabaseClient) {
  const { data } = await supabase.from("profiles").select("id").eq("role", "admin");
  return data || [];
}

export async function getProfileEmailByUsername(supabase: TypedSupabaseClient, username: string) {
  const { data, error } = await supabase.from("profiles").select("email").eq("username", username).maybeSingle();
  if (error || !data?.email) return null;
  return data.email;
}

export async function getProfileByUsername(supabase: TypedSupabaseClient, username: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (error) return null;
  return data as Profile;
}

export async function isUsernameTaken(supabase: TypedSupabaseClient, username: string) {
  const profile = await getProfileByUsername(supabase, username);
  return profile !== null;
}
