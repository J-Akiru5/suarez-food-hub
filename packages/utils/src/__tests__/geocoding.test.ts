import { describe, expect, it } from "vitest";
import {
  addressChangeInvalidatesPin,
  buildAddressSearchQueries,
  buildNominatimSearchUrl,
  ILOILO_VIEWBOX,
  normalizeAddressQuery,
  parseNominatimSearchResults,
} from "../geocoding";

describe("normalizeAddressQuery", () => {
  it("keeps a complete address intact", () => {
    expect(normalizeAddressQuery("Zone 7, Naslo, Pototan, Iloilo 5008, Philippines")).toBe(
      "Zone 7, Naslo, Pototan, Iloilo 5008, Philippines",
    );
  });

  it("drops N/A placeholders and empty comma segments", () => {
    expect(normalizeAddressQuery("N/A, Catubig, Badiangan, Iloilo, , Philippines")).toBe(
      "Catubig, Badiangan, Iloilo, Philippines",
    );
    expect(normalizeAddressQuery("  N/A  ")).toBe("");
    expect(normalizeAddressQuery("")).toBe("");
  });
});

describe("buildNominatimSearchUrl", () => {
  it("builds an encoded Philippine search biased toward Iloilo", () => {
    const url = buildNominatimSearchUrl("Zone 7, Naslo, Pototan, Iloilo 5008, Philippines");
    expect(url).not.toBeNull();
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(parsed.searchParams.get("q")).toBe("Zone 7, Naslo, Pototan, Iloilo 5008, Philippines");
    expect(parsed.searchParams.get("format")).toBe("jsonv2");
    expect(parsed.searchParams.get("countrycodes")).toBe("ph");
    expect(parsed.searchParams.get("limit")).toBe("5");
    expect(parsed.searchParams.get("viewbox")).toBe(ILOILO_VIEWBOX);
    expect(parsed.searchParams.get("bounded")).toBe("0");
  });

  it("returns null when there is no usable query", () => {
    expect(buildNominatimSearchUrl("N/A")).toBeNull();
    expect(buildNominatimSearchUrl("   ")).toBeNull();
  });
});

describe("parseNominatimSearchResults", () => {
  it("parses string coordinates and preserves display metadata", () => {
    const result = parseNominatimSearchResults([
      {
        lat: "10.9939",
        lon: "122.5742",
        display_name: "Naslo, Pototan, Iloilo, Western Visayas, Philippines",
        place_id: 123,
        type: "village",
        importance: 0.42,
      },
    ]);
    expect(result).toEqual([
      {
        lat: 10.9939,
        lng: 122.5742,
        displayName: "Naslo, Pototan, Iloilo, Western Visayas, Philippines",
        placeId: 123,
        type: "village",
        importance: 0.42,
      },
    ]);
  });

  it("drops invalid coordinates, missing names and duplicate points", () => {
    const result = parseNominatimSearchResults([
      { lat: "999", lon: "122.5", display_name: "Bad" },
      { lat: "10.99", lon: "122.57" },
      { lat: "10.99", lon: "122.57", display_name: "Duplicate" },
      { lat: "10.99", lon: "122.57", display_name: "First" },
      null,
      "junk",
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("Duplicate");
  });

  it("returns [] for non-array payloads", () => {
    expect(parseNominatimSearchResults(null)).toEqual([]);
    expect(parseNominatimSearchResults({})).toEqual([]);
    expect(parseNominatimSearchResults("nope")).toEqual([]);
  });
});

describe("buildAddressSearchQueries", () => {
  it("falls back past a Zone prefix that the provider cannot match", () => {
    expect(buildAddressSearchQueries("Zone 7, Naslo, Pototan, Iloilo 5008, Philippines")).toEqual([
      "Zone 7, Naslo, Pototan, Iloilo 5008, Philippines",
      "Naslo, Pototan, Iloilo 5008, Philippines",
    ]);
  });

  it("keeps a normal complete address as a single query", () => {
    expect(buildAddressSearchQueries("Naslo, Pototan, Iloilo, Philippines")).toEqual([
      "Naslo, Pototan, Iloilo, Philippines",
    ]);
  });

  it("drops house/block prefixes but keeps the street", () => {
    expect(buildAddressSearchQueries("House 5, Rizal St, Janiuay, Iloilo, Philippines")).toEqual([
      "House 5, Rizal St, Janiuay, Iloilo, Philippines",
      "Rizal St, Janiuay, Iloilo, Philippines",
    ]);
    expect(buildAddressSearchQueries("123, Rizal St, Janiuay, Iloilo")).toEqual([
      "123, Rizal St, Janiuay, Iloilo",
      "Rizal St, Janiuay, Iloilo",
    ]);
  });

  it("returns no queries for empty/placeholder addresses", () => {
    expect(buildAddressSearchQueries("N/A")).toEqual([]);
    expect(buildAddressSearchQueries("   ")).toEqual([]);
  });
});

describe("addressChangeInvalidatesPin", () => {
  it("invalidates an address-derived pin when the text changes", () => {
    expect(
      addressChangeInvalidatesPin({
        pinSource: "address",
        resolvedAddress: "Zone 7, Naslo, Pototan, Iloilo",
        nextAddress: "Zone 8, Naslo, Pototan, Iloilo",
      }),
    ).toBe(true);
  });

  it("keeps an address-derived pin for whitespace-only edits", () => {
    expect(
      addressChangeInvalidatesPin({
        pinSource: "address",
        resolvedAddress: "Naslo, Pototan, Iloilo",
        nextAddress: "  Naslo,  Pototan,  Iloilo ",
      }),
    ).toBe(false);
  });

  it("never invalidates GPS/manual pins", () => {
    for (const pinSource of ["gps", "map", null] as const) {
      expect(
        addressChangeInvalidatesPin({
          pinSource,
          resolvedAddress: "Naslo, Pototan, Iloilo",
          nextAddress: "Different address",
        }),
      ).toBe(false);
    }
  });
});
