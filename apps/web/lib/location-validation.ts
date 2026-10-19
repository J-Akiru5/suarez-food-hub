import type { TypedSupabaseClient } from "@repo/data-access";
import { type LocationRecord, validateLocationSelection } from "@repo/utils";

interface ProfileLocationSelection {
  townId?: string | null;
  districtId?: string | null;
  barangayId?: string | null;
}

/**
 * Server-side verification that a customer's saved/selected address is a real
 * hierarchy: district → city and barangay → district (see the location seed
 * migration for Iloilo City's district level).
 *
 * Only relationships that exist in the `locations` table are enforced —
 * barangays of PSGC-only towns are not cached there yet, so they stay
 * unverified (and therefore accepted) to keep every existing delivery town
 * working. Returns `null` when the selection is valid.
 */
export async function validateProfileLocationChain(
  supabase: TypedSupabaseClient,
  { townId, districtId, barangayId }: ProfileLocationSelection,
): Promise<string | null> {
  if (!districtId && !barangayId) return null;

  const fetchRow = async (id: string | null | undefined): Promise<LocationRecord | null> => {
    if (!id) return null;
    const { data } = await supabase.from("locations").select("id, type, parent_id").eq("id", id).maybeSingle();
    return (data as LocationRecord | null) ?? null;
  };

  const district = await fetchRow(districtId);
  const barangay = await fetchRow(barangayId);
  const barangayParent = barangay ? await fetchRow(barangay.parent_id) : null;

  return validateLocationSelection({ townId, districtId, barangayId }, { district, barangay, barangayParent });
}
