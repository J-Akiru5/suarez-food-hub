import { describe, expect, it } from "vitest";
import { type LocationRecord, validateLocationSelection } from "../locations";

// Iloilo City fixture — mirrors the seeded rows (district level added locally
// because PSGC publishes no district codes for Iloilo City).
const ILOILO_CITY = "063022000";
const JARO = "063022000-DJARO";
const MOLO = "063022000-DMOLO";
const JANUIAY = "063023000";

const JARO_ROW: LocationRecord = { id: JARO, type: "district", parent_id: ILOILO_CITY };
const MOLO_ROW: LocationRecord = { id: MOLO, type: "district", parent_id: ILOILO_CITY };
const BALABAGO: LocationRecord = { id: "063022010", type: "barangay", parent_id: JARO };
const MOLO_BRGY: LocationRecord = { id: "063022129", type: "barangay", parent_id: MOLO };
const JANIUAY_BRGY: LocationRecord = { id: "063030001", type: "barangay", parent_id: JANUIAY };

describe("validateLocationSelection", () => {
  it("accepts a valid city → district → barangay chain (Iloilo City → Jaro → Balabago)", () => {
    expect(
      validateLocationSelection(
        { townId: ILOILO_CITY, districtId: JARO, barangayId: "063022010" },
        { district: JARO_ROW, barangay: BALABAGO, barangayParent: JARO_ROW },
      ),
    ).toBeNull();
  });

  it("accepts a district without a barangay yet", () => {
    expect(validateLocationSelection({ townId: ILOILO_CITY, districtId: JARO }, { district: JARO_ROW })).toBeNull();
  });

  it("rejects a barangay that belongs to a different district", () => {
    expect(
      validateLocationSelection(
        { townId: ILOILO_CITY, districtId: JARO, barangayId: "063022129" },
        { district: JARO_ROW, barangay: MOLO_BRGY, barangayParent: MOLO_ROW },
      ),
    ).toBe("The selected barangay does not belong to the selected district.");
  });

  it("rejects a district that belongs to a different city", () => {
    expect(validateLocationSelection({ townId: JANUIAY, districtId: JARO }, { district: JARO_ROW })).toBe(
      "The selected district does not belong to the selected city.",
    );
  });

  it("rejects an unknown or non-district district id", () => {
    expect(validateLocationSelection({ townId: ILOILO_CITY, districtId: "nope" }, {})).toBe(
      "Unknown district selected.",
    );
    expect(
      validateLocationSelection(
        { townId: ILOILO_CITY, districtId: JARO },
        { district: { id: JARO, type: "city", parent_id: ILOILO_CITY } },
      ),
    ).toBe("Invalid district selected.");
  });

  it("requires the district when the barangay is known to belong to one", () => {
    expect(
      validateLocationSelection(
        { townId: ILOILO_CITY, barangayId: "063022010" },
        { barangay: BALABAGO, barangayParent: JARO_ROW },
      ),
    ).toBe("Please select the district for the selected barangay.");
  });

  it("rejects a barangay that does not belong to the selected city", () => {
    expect(
      validateLocationSelection(
        { townId: ILOILO_CITY, barangayId: "063030001" },
        { barangay: JANIUAY_BRGY, barangayParent: { id: JANUIAY, type: "city", parent_id: null } },
      ),
    ).toBe("The selected barangay does not belong to the selected city.");
  });

  it("leaves PSGC-only barangays (not cached in locations) unverified but allowed", () => {
    expect(
      validateLocationSelection({ townId: JANUIAY, barangayId: "063030099" }, { barangay: null, barangayParent: null }),
    ).toBeNull();
  });

  it("validates nothing when no district/barangay was selected", () => {
    expect(validateLocationSelection({ townId: ILOILO_CITY }, {})).toBeNull();
    expect(validateLocationSelection({}, {})).toBeNull();
  });
});
