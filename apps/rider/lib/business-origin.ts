// Resolve the restaurant origin used in Google Maps navigation links.
//
// Priority: business.base_lat/base_lng (migration 0021) → business.address
// (Google geocodes address strings in directions URLs) → Iloilo City fallback.
// The address fallback works even before migration 0021 is applied, so the
// rider's directions start from the actual restaurant (Janiuay) instead of the
// old hardcoded Iloilo City coordinate.
export async function getBusinessOrigin(supabase: { from: (table: string) => any }): Promise<string> {
  const fallback = "10.9501875,122.5065625";

  let { data } = await supabase.from("business").select("base_lat, base_lng, address").limit(1).maybeSingle();

  // base_lat/base_lng only exist after migration 0021 — retry with just the
  // address column so the restaurant origin still works in the meantime.
  if (!data) {
    const fallbackRes = await supabase.from("business").select("address").limit(1).maybeSingle();
    data = fallbackRes.data;
  }

  if (!data) return fallback;
  const b = data as { base_lat?: number | null; base_lng?: number | null; address?: string | null };
  if (b.base_lat && b.base_lng) return `${b.base_lat},${b.base_lng}`;
  if (b.address) return b.address;
  return fallback;
}
