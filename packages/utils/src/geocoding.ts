import { isValidCoordinates } from "./delivery";

/**
 * Address → coordinates helpers for the customer checkout.
 *
 * Reuses the same OpenStreetMap Nominatim provider already used for reverse
 * geocoding the map pin. The viewbox biases partial Philippine addresses
 * toward the Iloilo service area without excluding valid results elsewhere.
 */

export interface GeocodeCandidate {
  lat: number;
  lng: number;
  displayName: string;
  placeId?: number;
  /** Nominatim `class`, when present. */
  category?: string;
  /** Nominatim `type` (school, town, quarter, house, ...). */
  type?: string;
  /** Nominatim `addresstype` (amenity, town, house, ...). */
  addresstype?: string;
  /** Nominatim `place_rank`; lower ranks are broader administrative areas. */
  placeRank?: number;
  importance?: number;
}

export type GeocodePrecision = "exact" | "approximate" | "broad";
export type PinSource = "address" | "gps" | "map" | null;

export const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

// Nominatim viewbox order: left,top,right,bottom (a bias, not a hard filter).
export const ILOILO_VIEWBOX = "121.9,11.5,123.3,10.2";

export const GEOCODE_TIMEOUT_MS = 12_000;
export const GEOCODE_TIMEOUT_MESSAGE = "Address lookup timed out. Try again or set the pin manually on the map.";
export const GEOCODE_MALFORMED_MESSAGE =
  "Address lookup returned an unexpected response. Try again or set the pin manually on the map.";
export const GEOCODE_NO_RESULTS_MESSAGE =
  "No matching location found. Add a barangay or municipality, or set the pin manually on the map.";

// Prefixes that commonly prevent a provider from matching an otherwise valid
// Philippine address. A meaningful remainder (e.g. "Naslo" in "Barangay
// Naslo") is kept; a pure locality number (e.g. "Zone 7") is dropped.
const GENERIC_ONLY =
  /^(?:(?:barangay|brgy\.?|bgy\.?|blk\.?|block|lot|purok|zone|sitio|house|unit|bldg\.?|building|street\s*no|no\.?|\d+[a-z]?|[\s,.-])+)$/i;
const GENERIC_PREFIX = /^(?:purok|zone|sitio|blk\.?|block|lot|house|unit|bldg\.?|building|street\s*no|no\.?)\s+/i;

/**
 * Clean a free-text address before geocoding. Drops placeholder segments such
 * as "N/A" (seen in saved addresses) and collapses empty comma segments.
 */
export function normalizeAddressQuery(address: string): string {
  if (typeof address !== "string") return "";
  return address
    .split(",")
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter((part) => part && !/^(n\/?a\.?|none)$/i.test(part))
    .join(", ");
}

/**
 * Clean one comma-separated address component:
 *   "Barangay Naslo" -> "Naslo"
 *   "Brgy. San Isidro" -> "San Isidro"
 *   "Sitio Malipayon" -> "Malipayon"
 *   "Zone 7" / "Purok 3" / "House 5" / "Block 5 Lot 6" -> ""
 */
export function cleanAddressPart(part: string): string {
  let value = part.trim().replace(/\s+/g, " ");
  if (!value) return "";

  value = value.replace(/^(barangay|brgy\.?|bgy\.?)\s+/i, "").trim();
  if (!value || GENERIC_ONLY.test(value)) return "";

  const hadGenericPrefix = GENERIC_PREFIX.test(value);
  value = value.replace(GENERIC_PREFIX, "").trim();
  if (!value || /^[0-9]+[a-z]?$/i.test(value)) return "";
  if (hadGenericPrefix) {
    // "Zone 7 Poblacion" -> "Poblacion"; "House 5 Rizal St" -> "Rizal St".
    value = value.replace(/^\d+[a-z]?\s+/i, "").trim();
  }
  return value;
}

/**
 * Build a small, deterministic query plan (max 4 requests):
 *   1. components with barangay/zone/house noise removed (best first)
 *   2. the address exactly as typed, if different
 *   3. drop the first component (street/house/barangay) for a barangay-level match
 *   4. the final three components for a municipality-level fallback
 * Queries are deduplicated; the caller must rate-limit between requests.
 */
export function buildAddressSearchQueries(address: string): string[] {
  const normalized = normalizeAddressQuery(address);
  if (!normalized) return [];

  const rawParts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const cleanedParts = rawParts.map(cleanAddressPart).filter(Boolean);
  if (cleanedParts.length === 0) return [];

  const queries: string[] = [];
  const add = (parts: string[]) => {
    const query = parts.join(", ").trim();
    if (query && !queries.includes(query)) queries.push(query);
  };

  add(cleanedParts);
  add(rawParts);
  if (cleanedParts.length >= 3) add(cleanedParts.slice(1));
  if (cleanedParts.length >= 4) add(cleanedParts.slice(-3));
  return queries.slice(0, 4);
}

/** Build the Nominatim search URL, or null when there is no usable address. */
export function buildNominatimSearchUrl(address: string, options?: { limit?: number }): string | null {
  const query = normalizeAddressQuery(address);
  if (!query) return null;

  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    addressdetails: "1",
    limit: String(options?.limit ?? 5),
    countrycodes: "ph",
    "accept-language": "en",
    viewbox: ILOILO_VIEWBOX,
    bounded: "0",
  });
  return `${NOMINATIM_SEARCH_URL}?${params.toString()}`;
}

/**
 * Parse Nominatim search results into validated candidates. Nominatim returns
 * lat/lon as strings; invalid entries, missing display names and duplicate
 * coordinate pairs are dropped.
 */
export function parseNominatimSearchResults(raw: unknown): GeocodeCandidate[] {
  if (!Array.isArray(raw)) return [];

  const candidates: GeocodeCandidate[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const lat = typeof record.lat === "string" ? Number(record.lat) : record.lat;
    const lng = typeof record.lon === "string" ? Number(record.lon) : record.lon;
    if (!isValidCoordinates(lat, lng)) continue;

    const displayName = typeof record.display_name === "string" ? record.display_name.trim() : "";
    if (!displayName) continue;

    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const key = `${latNumber.toFixed(6)},${lngNumber.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const placeRank =
      typeof record.place_rank === "number"
        ? record.place_rank
        : typeof record.place_rank === "string"
          ? Number(record.place_rank)
          : undefined;

    candidates.push({
      lat: latNumber,
      lng: lngNumber,
      displayName,
      placeId: typeof record.place_id === "number" ? record.place_id : undefined,
      category: typeof record.class === "string" ? record.class : undefined,
      type: typeof record.type === "string" ? record.type : undefined,
      addresstype: typeof record.addresstype === "string" ? record.addresstype : undefined,
      placeRank: placeRank != null && Number.isFinite(placeRank) ? placeRank : undefined,
      importance: typeof record.importance === "number" ? record.importance : undefined,
    });
  }

  return candidates;
}

/**
 * Exact = a house/building footprint. Everything else is approximate:
 * landmarks/streets/barangays are "approximate"; municipalities, cities and
 * provinces are "broad". Broad results must never be presented as a doorstep.
 */
export function geocodePrecision(candidate: GeocodeCandidate): GeocodePrecision {
  const addressType = (candidate.addresstype ?? "").toLowerCase();
  const type = (candidate.type ?? "").toLowerCase();
  const rank = candidate.placeRank ?? 0;

  if (["house", "building", "apartments", "detached"].includes(addressType) || ["house", "building"].includes(type)) {
    return "exact";
  }
  if (
    ["town", "city", "municipality", "county", "state", "region", "province", "administrative"].includes(addressType) ||
    (rank > 0 && rank < 19)
  ) {
    return "broad";
  }
  return "approximate";
}

/** Only a single precise house/building match may be applied without confirmation. */
export function shouldAutoApplyGeocodeCandidate(candidates: GeocodeCandidate[]): boolean {
  return candidates.length === 1 && geocodePrecision(candidates[0]) === "exact";
}

const GENERIC_TOKENS = new Set([
  "barangay",
  "brgy",
  "bgy",
  "purok",
  "zone",
  "sitio",
  "block",
  "blk",
  "lot",
  "house",
  "unit",
  "building",
  "bldg",
  "street",
  "st",
  "road",
  "rd",
  "city",
  "municipality",
  "province",
  "region",
  "philippines",
  "western",
  "visayas",
  "san",
  "santa",
  "santo",
  "sto",
  "sta",
]);

function tokenize(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token) && !GENERIC_TOKENS.has(token));
}

/**
 * Reject provider results that do not contain the most specific part of the
 * query. Example: "Barangay Naslo..." must not accept a result for a school in
 * a different Pototan ward just because the municipality matches.
 */
export function candidateMatchesQuery(query: string, candidate: GeocodeCandidate): boolean {
  const firstPart = query.split(",")[0]?.trim() ?? "";
  let tokens = tokenize(firstPart);
  if (tokens.length === 0) tokens = tokenize(query);
  if (tokens.length === 0) return true; // nothing specific to compare

  const name = candidate.displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return tokens.some((token) => name.includes(token));
}

/** Actionable copy for provider HTTP failures. */
export function geocodeHttpErrorMessage(status: number): string {
  if (status === 429) {
    return "Address lookup is busy right now (rate limited). Wait a moment and try again, or set the pin manually on the map.";
  }
  if (status === 403) {
    return "Address lookup is unavailable from this browser or network. Set the pin manually on the map, or try again later.";
  }
  if (status >= 500) {
    return "The address lookup service is temporarily unavailable. Try again or set the pin manually on the map.";
  }
  return `Address lookup failed (HTTP ${status}). Try again or set the pin manually on the map.`;
}

export type GeocodeResponseKind = "ok" | "empty" | "error";

export interface GeocodeResponseResult {
  kind: GeocodeResponseKind;
  candidates: GeocodeCandidate[];
  error?: string;
}

/**
 * Interpret one Nominatim response: HTTP failure, malformed body, zero/relevant
 * candidates. "empty" means this query can safely fall back to the next one;
 * "error" means stop (e.g. rate limited or unauthorized).
 */
export function interpretGeocodeResponse(status: number, raw: unknown, query?: string): GeocodeResponseResult {
  if (status < 200 || status >= 300) {
    return { kind: "error", candidates: [], error: geocodeHttpErrorMessage(status) };
  }
  if (!Array.isArray(raw)) {
    return { kind: "error", candidates: [], error: GEOCODE_MALFORMED_MESSAGE };
  }

  const candidates = parseNominatimSearchResults(raw).filter(
    (candidate) => !query || candidateMatchesQuery(query, candidate),
  );
  if (candidates.length === 0) return { kind: "empty", candidates: [] };
  return { kind: "ok", candidates };
}

/**
 * Editing the address must invalidate an address-derived pin, but not a GPS or
 * manually chosen pin (those describe the actual device/map destination).
 * Whitespace/punctuation-only edits keep the resolved pin.
 */
export function addressChangeInvalidatesPin(params: {
  pinSource: PinSource;
  resolvedAddress: string | null;
  nextAddress: string;
}): boolean {
  if (params.pinSource !== "address") return false;
  if (!params.resolvedAddress) return true;
  return normalizeAddressQuery(params.nextAddress) !== normalizeAddressQuery(params.resolvedAddress);
}
