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
  type?: string;
  importance?: number;
}

export type PinSource = "address" | "gps" | "map" | null;

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

export const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

// Nominatim viewbox order: left,top,right,bottom (a bias, not a hard filter).
export const ILOILO_VIEWBOX = "121.9,11.5,123.3,10.2";

/**
 * Clean a free-text address before geocoding. Drops placeholder segments such
 * as "N/A" (seen in saved addresses) and collapses empty comma segments.
 */
export function normalizeAddressQuery(address: string): string {
  if (typeof address !== "string") return "";
  return address
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^(n\/?a\.?|none)$/i.test(part))
    .join(", ");
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

// Leading segments that usually prevent Nominatim from matching an otherwise
// valid barangay/municipality address (e.g. "Zone 7" in the reported example).
const GENERIC_LOCALITY_PREFIX = /^(zone|purok|sitio|blk|block|lot|house|unit|bldg|building|street no|no\.?)\b/i;

function isGenericAddressPrefix(part: string): boolean {
  return /^\d+[a-z]?$/i.test(part) || GENERIC_LOCALITY_PREFIX.test(part);
}

/**
 * Progressively relaxed queries for an address. The full address is tried
 * first; if it contains a zone/purok/block/house prefix that providers often
 * cannot match, a second query drops those segments. Keep this list small —
 * each fallback is another public-provider request.
 */
export function buildAddressSearchQueries(address: string): string[] {
  const normalized = normalizeAddressQuery(address);
  if (!normalized) return [];

  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const queries: string[] = [];

  const add = (query: string) => {
    const clean = query.trim();
    if (clean && !queries.includes(clean)) queries.push(clean);
  };

  add(parts.join(", "));
  const withoutGenericPrefixes = parts.filter((part) => !isGenericAddressPrefix(part));
  if (withoutGenericPrefixes.length >= 2) add(withoutGenericPrefixes.join(", "));

  return queries;
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

    candidates.push({
      lat: latNumber,
      lng: lngNumber,
      displayName,
      placeId: typeof record.place_id === "number" ? record.place_id : undefined,
      type: typeof record.type === "string" ? record.type : undefined,
      importance: typeof record.importance === "number" ? record.importance : undefined,
    });
  }

  return candidates;
}
