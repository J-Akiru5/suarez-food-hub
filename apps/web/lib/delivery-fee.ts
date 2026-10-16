import type { TypedSupabaseClient } from "@repo/data-access";
import {
  calculateDistance,
  DEFAULT_FLAT_FEE,
  type DeliveryTier,
  feeForDistance,
  maxDeliveryKm,
  parseDeliveryTiers,
} from "@repo/utils";

/**
 * Server-side delivery fee resolution — the single authority used by both
 * POST /api/orders (authoritative charge) and POST /api/delivery-estimate
 * (checkout preview), so the estimate and the final total can't diverge.
 *
 * Distance source, in priority order:
 *   1. Explicit coordinates (map pin / geolocation at checkout)
 *   2. Town centroid from the locations table (orders without a pin)
 *   3. Flat-fee fallback (business.delivery_fee) when neither exists
 *
 * Client-sent totals are NEVER trusted — this only ever reads the business
 * config from the DB.
 */
export interface DeliveryFeeOutcome {
  /** Fee in PHP (rounded to 2 decimals). */
  fee: number;
  /** Distance in km used to price the fee (null when falling back to the flat fee). */
  distanceKm: number | null;
  /** How the distance was derived — useful for the estimate UI and debugging. */
  source: "pin" | "town_centroid" | "flat_fee";
  /** True when the customer is beyond the last tier / max_delivery_km. */
  outOfRange: boolean;
  maxKm: number | null;
  tiers: DeliveryTier[];
}

interface ResolveArgs {
  supabase: TypedSupabaseClient;
  /** Map pin / geolocation coordinates from checkout, if set. */
  pin?: { lat: number; lng: number } | null;
  /** Profile town (PSGC) id — used to look up the town centroid when no pin. */
  townId?: string | null;
}

export async function resolveDeliveryFee({ supabase, pin, townId }: ResolveArgs): Promise<DeliveryFeeOutcome> {
  const { data: biz } = await supabase
    .from("business")
    .select("base_lat, base_lng, delivery_fee, delivery_tiers, max_delivery_km")
    .limit(1)
    .maybeSingle();

  const tiers = parseDeliveryTiers(biz?.delivery_tiers);
  const flatFee = Number(biz?.delivery_fee ?? DEFAULT_FLAT_FEE);
  const maxKm = Number(biz?.max_delivery_km) > 0 ? Number(biz?.max_delivery_km) : (maxDeliveryKm(tiers) ?? null);

  const origin =
    biz?.base_lat != null && biz?.base_lng != null ? { lat: Number(biz.base_lat), lng: Number(biz.base_lng) } : null;

  // Resolve destination coordinates: pin first, then town centroid.
  let dest: { lat: number; lng: number } | null = null;
  let source: DeliveryFeeOutcome["source"] = "flat_fee";

  if (pin && Number.isFinite(pin.lat) && Number.isFinite(pin.lng)) {
    dest = { lat: pin.lat, lng: pin.lng };
    source = "pin";
  } else if (townId) {
    const { data: loc } = await supabase
      .from("locations")
      .select("centroid_lat, centroid_lng")
      .eq("id", townId)
      .maybeSingle();
    if (loc?.centroid_lat != null && loc?.centroid_lng != null) {
      dest = { lat: Number(loc.centroid_lat), lng: Number(loc.centroid_lng) };
      source = "town_centroid";
    }
  }

  // No origin (store coords missing) or no destination → flat-fee fallback.
  if (!origin || !dest || tiers.length === 0) {
    return {
      fee: Math.round(flatFee * 100) / 100,
      distanceKm: null,
      source: "flat_fee",
      outOfRange: false,
      maxKm,
      tiers,
    };
  }

  const distanceKm = Math.round(calculateDistance(origin.lat, origin.lng, dest.lat, dest.lng) * 10) / 10;
  const outOfRange = maxKm != null && distanceKm > maxKm;
  const result = feeForDistance(distanceKm, tiers, flatFee);

  return {
    fee: Math.round(result.fee * 100) / 100,
    distanceKm,
    source,
    outOfRange,
    maxKm,
    tiers,
  };
}
