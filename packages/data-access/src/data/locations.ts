import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";

type LocationType = Database["public"]["Enums"]["location_type"];

export async function getLocations(supabase: TypedSupabaseClient, type?: LocationType, parentId?: string) {
  let query = supabase.from("locations").select("*").order("name");
  if (type) query = query.eq("type", type);
  if (parentId) query = query.eq("parent_id", parentId);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getRiderLocations(supabase: TypedSupabaseClient, riderId: string) {
  const { data } = await supabase
    .from("rider_locations")
    .select("latitude, longitude")
    .eq("rider_id", riderId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function upsertRiderLocation(
  supabase: TypedSupabaseClient,
  riderId: string,
  latitude: number,
  longitude: number,
  orderId?: string,
) {
  const { error } = await supabase.from("rider_locations").upsert(
    {
      rider_id: riderId,
      latitude,
      longitude,
      order_id: orderId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rider_id" },
  );
  return { error };
}
