import { describe, expect, it } from "vitest";
import {
  addressChangeInvalidatesPin,
  buildAddressSearchQueries,
  buildNominatimSearchUrl,
  candidateMatchesQuery,
  cleanAddressPart,
  GEOCODE_MALFORMED_MESSAGE,
  GEOCODE_NO_RESULTS_MESSAGE,
  GEOCODE_TIMEOUT_MESSAGE,
  type GeocodeCandidate,
  geocodeHttpErrorMessage,
  geocodePrecision,
  ILOILO_VIEWBOX,
  interpretGeocodeResponse,
  normalizeAddressQuery,
  parseNominatimSearchResults,
  shouldAutoApplyGeocodeCandidate,
} from "../geocoding";

function candidate(overrides: Partial<GeocodeCandidate>): GeocodeCandidate {
  return {
    lat: 10.95,
    lng: 122.5,
    displayName: "Somewhere, Iloilo, Philippines",
    ...overrides,
  };
}

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

describe("cleanAddressPart", () => {
  it("strips barangay/brgy prefixes while keeping the place name", () => {
    expect(cleanAddressPart("Barangay Naslo")).toBe("Naslo");
    expect(cleanAddressPart("Brgy. San Isidro")).toBe("San Isidro");
    expect(cleanAddressPart("Bgy. San Isidro")).toBe("San Isidro");
  });

  it("drops pure zone/purok/house/block noise", () => {
    for (const part of ["Zone 7", "Purok 3", "House 5", "Unit 3B", "Block 5 Lot 6", "123", "Barangay"]) {
      expect(cleanAddressPart(part), part).toBe("");
    }
  });

  it("keeps meaningful sitio and street names", () => {
    expect(cleanAddressPart("Sitio Malipayon")).toBe("Malipayon");
    expect(cleanAddressPart("Poblacion")).toBe("Poblacion");
    expect(cleanAddressPart("123 Rizal St")).toBe("123 Rizal St");
    expect(cleanAddressPart("Zone 7 Poblacion")).toBe("Poblacion");
    expect(cleanAddressPart("House 5 Rizal St")).toBe("Rizal St");
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
  it("parses coordinates and precision metadata", () => {
    const result = parseNominatimSearchResults([
      {
        lat: "10.9939",
        lon: "122.5742",
        display_name: "Naslo, Pototan, Iloilo, Western Visayas, Philippines",
        place_id: 123,
        class: "place",
        type: "village",
        addresstype: "village",
        place_rank: 19,
        importance: 0.42,
      },
    ]);
    expect(result).toEqual([
      {
        lat: 10.9939,
        lng: 122.5742,
        displayName: "Naslo, Pototan, Iloilo, Western Visayas, Philippines",
        placeId: 123,
        category: "place",
        type: "village",
        addresstype: "village",
        placeRank: 19,
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
  it("prefers a noise-free query and still offers the typed string + controlled fallbacks", () => {
    expect(buildAddressSearchQueries("Zone 7, Naslo, Pototan, Iloilo 5008, Philippines")).toEqual([
      "Naslo, Pototan, Iloilo 5008, Philippines",
      "Zone 7, Naslo, Pototan, Iloilo 5008, Philippines",
      "Pototan, Iloilo 5008, Philippines",
    ]);
  });

  it("strips a barangay prefix before querying", () => {
    expect(buildAddressSearchQueries("Barangay Naslo, Pototan, Iloilo, Philippines")).toEqual([
      "Naslo, Pototan, Iloilo, Philippines",
      "Barangay Naslo, Pototan, Iloilo, Philippines",
      "Pototan, Iloilo, Philippines",
    ]);
  });

  it("drops a house prefix and keeps the street; later falls back to barangay/municipality", () => {
    expect(buildAddressSearchQueries("House 5, Rizal St, Janiuay, Iloilo, Philippines")).toEqual([
      "Rizal St, Janiuay, Iloilo, Philippines",
      "House 5, Rizal St, Janiuay, Iloilo, Philippines",
      "Janiuay, Iloilo, Philippines",
    ]);
    expect(buildAddressSearchQueries("123, Rizal St, Janiuay, Iloilo")).toEqual([
      "Rizal St, Janiuay, Iloilo",
      "123, Rizal St, Janiuay, Iloilo",
      "Janiuay, Iloilo",
    ]);
  });

  it("drops an unknown street in a controlled barangay fallback", () => {
    expect(buildAddressSearchQueries("123 Rizal St, Naslo, Pototan, Iloilo, Philippines")).toEqual([
      "123 Rizal St, Naslo, Pototan, Iloilo, Philippines",
      "Naslo, Pototan, Iloilo, Philippines",
      "Pototan, Iloilo, Philippines",
    ]);
  });

  it("provides a municipality-level fallback for a barangay the provider may not know", () => {
    expect(buildAddressSearchQueries("Poblacion, Pototan, Iloilo, Philippines")).toEqual([
      "Poblacion, Pototan, Iloilo, Philippines",
      "Pototan, Iloilo, Philippines",
    ]);
  });

  it("returns no queries for empty/placeholder addresses", () => {
    expect(buildAddressSearchQueries("N/A")).toEqual([]);
    expect(buildAddressSearchQueries("   ")).toEqual([]);
  });
});

describe("candidateMatchesQuery", () => {
  it("rejects an unrelated result that only matches the municipality", () => {
    expect(
      candidateMatchesQuery(
        "Naslo, Pototan, Iloilo, Philippines",
        candidate({
          displayName: "Palanguia National High School, Primitivo Ledesma Ward, Pototan, Iloilo, Philippines",
        }),
      ),
    ).toBe(false);
  });

  it("accepts results containing the specific barangay/road token", () => {
    expect(
      candidateMatchesQuery(
        "Naslo, Pototan, Iloilo, Philippines",
        candidate({ displayName: "Naslo Elementary School, Pototan, Iloilo, Philippines" }),
      ),
    ).toBe(true);
    expect(
      candidateMatchesQuery(
        "San Isidro, Jaro, Iloilo City, Philippines",
        candidate({ displayName: "San Isidro, Jaro, Iloilo City, Philippines" }),
      ),
    ).toBe(true);
    expect(
      candidateMatchesQuery(
        "Pototan, Iloilo, Philippines",
        candidate({ displayName: "Pototan, Iloilo, Western Visayas, Philippines" }),
      ),
    ).toBe(true);
  });

  it("does not match a street query to a barangay landmark", () => {
    expect(
      candidateMatchesQuery(
        "123 Rizal St, Naslo, Pototan, Iloilo, Philippines",
        candidate({ displayName: "Naslo Elementary School, Pototan, Iloilo, Philippines" }),
      ),
    ).toBe(false);
  });
});

describe("geocodePrecision", () => {
  it("classifies houses/buildings as exact", () => {
    expect(geocodePrecision(candidate({ addresstype: "house", type: "house", placeRank: 30 }))).toBe("exact");
    expect(geocodePrecision(candidate({ addresstype: "building", type: "yes", placeRank: 30 }))).toBe("exact");
  });

  it("classifies landmarks, streets and barangays as approximate", () => {
    expect(geocodePrecision(candidate({ addresstype: "amenity", type: "school", placeRank: 30 }))).toBe("approximate");
    expect(geocodePrecision(candidate({ addresstype: "quarter", type: "quarter", placeRank: 20 }))).toBe("approximate");
    expect(geocodePrecision(candidate({ addresstype: "highway", type: "residential", placeRank: 24 }))).toBe(
      "approximate",
    );
  });

  it("classifies municipalities/cities/provinces as broad", () => {
    expect(geocodePrecision(candidate({ addresstype: "town", type: "town", placeRank: 18 }))).toBe("broad");
    expect(geocodePrecision(candidate({ addresstype: "city", type: "city", placeRank: 16 }))).toBe("broad");
    expect(geocodePrecision(candidate({ addresstype: "province", type: "province", placeRank: 12 }))).toBe("broad");
  });
});

describe("shouldAutoApplyGeocodeCandidate", () => {
  it("auto-applies only a single exact building match", () => {
    expect(
      shouldAutoApplyGeocodeCandidate([
        candidate({ addresstype: "house", type: "house", placeRank: 30, displayName: "12 Rizal St, Iloilo" }),
      ]),
    ).toBe(true);
  });

  it("requires confirmation for a single approximate or broad result", () => {
    expect(
      shouldAutoApplyGeocodeCandidate([candidate({ addresstype: "amenity", type: "school", placeRank: 30 })]),
    ).toBe(false);
    expect(shouldAutoApplyGeocodeCandidate([candidate({ addresstype: "town", type: "town", placeRank: 18 })])).toBe(
      false,
    );
  });

  it("never auto-applies multiple candidates", () => {
    expect(
      shouldAutoApplyGeocodeCandidate([
        candidate({ addresstype: "house", type: "house", placeRank: 30 }),
        candidate({ addresstype: "house", type: "house", placeRank: 30, lat: 10.96 }),
      ]),
    ).toBe(false);
  });
});

describe("geocodeHttpErrorMessage", () => {
  it("explains rate limits, authorization, server failures and other HTTP errors", () => {
    expect(geocodeHttpErrorMessage(429)).toMatch(/rate limited/i);
    expect(geocodeHttpErrorMessage(403)).toMatch(/unavailable from this browser or network/i);
    expect(geocodeHttpErrorMessage(503)).toMatch(/temporarily unavailable/i);
    expect(geocodeHttpErrorMessage(400)).toMatch(/HTTP 400/);
  });

  it("has actionable timeout/malformed/no-result copy", () => {
    expect(GEOCODE_TIMEOUT_MESSAGE).toMatch(/timed out/i);
    expect(GEOCODE_MALFORMED_MESSAGE).toMatch(/unexpected response/i);
    expect(GEOCODE_NO_RESULTS_MESSAGE).toMatch(/No matching location/i);
  });
});

describe("interpretGeocodeResponse", () => {
  const validPayload = [
    {
      lat: "10.9550639",
      lon: "122.6116853",
      display_name: "Naslo Elementary School, Pototan, Iloilo, Philippines",
      addresstype: "amenity",
      type: "school",
      place_rank: 30,
    },
  ];

  it("returns relevant candidates for a successful response", () => {
    const result = interpretGeocodeResponse(200, validPayload, "Naslo, Pototan, Iloilo, Philippines");
    expect(result.kind).toBe("ok");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].displayName).toContain("Naslo");
  });

  it("returns empty for zero results or only irrelevant results", () => {
    expect(interpretGeocodeResponse(200, [], "Naslo, Pototan, Iloilo, Philippines").kind).toBe("empty");
    const irrelevant = [
      {
        lat: "10.95",
        lon: "122.61",
        display_name: "Palanguia National High School, Pototan, Iloilo, Philippines",
      },
    ];
    expect(interpretGeocodeResponse(200, irrelevant, "Naslo, Pototan, Iloilo, Philippines").kind).toBe("empty");
  });

  it("returns a malformed-response error for non-array bodies", () => {
    const result = interpretGeocodeResponse(200, { error: "nope" }, "Naslo, Pototan");
    expect(result.kind).toBe("error");
    expect(result.error).toMatch(/unexpected response/i);
  });

  it("returns actionable errors for HTTP/rate-limit failures", () => {
    expect(interpretGeocodeResponse(429, null, "Naslo").error).toMatch(/rate limited/i);
    expect(interpretGeocodeResponse(403, null, "Naslo").error).toMatch(/unavailable from this browser or network/i);
    expect(interpretGeocodeResponse(503, null, "Naslo").error).toMatch(/temporarily unavailable/i);
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
