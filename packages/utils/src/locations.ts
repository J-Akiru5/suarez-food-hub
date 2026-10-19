/**
 * Location-hierarchy helpers for the customer address flow.
 *
 * The app keeps its PSGC location cache in the `locations` table
 * (self-referencing via `parent_id`). Iloilo City additionally has a
 * 'district' level (Jaro, Molo, ...) that PSGC does not publish; those
 * districts and their barangays are seeded locally.
 *
 * `validateLocationSelection` is pure so both the profile and the order API
 * routes enforce exactly the same city → district → barangay rules.
 */

export interface LocationRecord {
  id: string;
  type: string;
  parent_id: string | null;
}

export interface LocationSelection {
  /** City/municipality the customer selected (PSGC code, e.g. 063022000). */
  townId?: string | null;
  /** District within the city, when the city has districts (e.g. 063022000-DJARO). */
  districtId?: string | null;
  /** Barangay within the district/city (PSGC code, e.g. 063022010). */
  barangayId?: string | null;
}

export interface LocationRelationRows {
  /** `locations` row for LocationSelection.districtId, when one was requested. */
  district?: LocationRecord | null;
  /** `locations` row for LocationSelection.barangayId, when one was requested. */
  barangay?: LocationRecord | null;
  /** Parent row of the barangay (a district or a city), when the barangay row exists. */
  barangayParent?: LocationRecord | null;
}

/**
 * Validate a customer's selected city → district → barangay chain against the
 * known location rows.
 *
 * Returns `null` when the selection is valid (or cannot be contradicted), or a
 * human-readable error message when a stored relationship is violated.
 *
 * Relationships are only enforced when the rows exist in the `locations`
 * table: barangays of PSGC-only towns are not cached in the DB yet, so an
 * unknown barangay is treated as "cannot verify" rather than invalid — this
 * keeps every previously accepted town/barangay combination working.
 */
export function validateLocationSelection(selection: LocationSelection, rows: LocationRelationRows): string | null {
  const { townId, districtId, barangayId } = selection;
  const { district, barangay, barangayParent } = rows;

  if (districtId) {
    if (!district) return "Unknown district selected.";
    if (district.type !== "district") return "Invalid district selected.";
    if (townId && district.parent_id !== townId) {
      return "The selected district does not belong to the selected city.";
    }
  }

  if (barangayId) {
    if (!barangay) return null; // Not cached (PSGC-only town) — nothing to verify.
    if (barangay.type !== "barangay") return "Invalid barangay selected.";

    if (districtId) {
      if (barangay.parent_id !== districtId) {
        return "The selected barangay does not belong to the selected district.";
      }
    } else if (barangayParent?.type === "district") {
      // The barangay belongs to a district of this city, but none was selected.
      return "Please select the district for the selected barangay.";
    } else if (townId && barangay.parent_id !== townId) {
      return "The selected barangay does not belong to the selected city.";
    }
  }

  return null;
}
