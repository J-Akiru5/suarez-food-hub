/**
 * Distance-based delivery fee utilities.
 *
 * Shared by:
 *  - apps/web API routes (authoritative fee computation on order placement
 *    and the checkout estimate endpoint)
 *  - apps/web checkout page (client-side display only)
 *  - apps/rider (calculateDistance re-export; rider maps show distance too)
 *
 * Single source of truth for the fee formula so the checkout estimate and
 * the server-computed order total can never drift apart.
 */

export interface DeliveryTier {
  /** Upper bound of this tier in kilometers (inclusive). */
  max_km: number;
  /** Fee in PHP charged for distances up to max_km. */
  fee: number;
}

export interface DeliveryFeeResult {
  fee: number;
  /** The tier that priced this delivery, or null when falling back to the flat fee. */
  tier: DeliveryTier | null;
  /** True when the fee came from the flat-fee fallback (no tiers / no distance). */
  isFallback: boolean;
}

/** Fallback flat fee used when no tiers are configured or distance is unknown. */
export const DEFAULT_FLAT_FEE = 40;

/**
 * Haversine distance between two coordinates, in kilometers.
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Sanitize a delivery_tiers value from the DB (JSONB, so it arrives as any)
 * into a sorted, numeric-only tier list. Invalid entries are dropped;
 * tiers are sorted ascending by max_km.
 */
export function parseDeliveryTiers(raw: unknown): DeliveryTier[] {
  if (!Array.isArray(raw)) return [];
  const tiers: DeliveryTier[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const maxKm = Number((entry as Record<string, unknown>).max_km);
    const fee = Number((entry as Record<string, unknown>).fee);
    if (!Number.isFinite(maxKm) || maxKm <= 0) continue;
    if (!Number.isFinite(fee) || fee < 0) continue;
    tiers.push({ max_km: maxKm, fee });
  }
  tiers.sort((a, b) => a.max_km - b.max_km);
  return tiers;
}

/** The furthest servable distance — the last tier's max_km (null if no tiers). */
export function maxDeliveryKm(tiers: DeliveryTier[]): number | null {
  return tiers.length > 0 ? tiers[tiers.length - 1].max_km : null;
}

/**
 * Look up the fee for a distance. Returns the flat-fee fallback (with
 * `tier: null`) when no tiers are configured.
 */
export function feeForDistance(distanceKm: number, tiers: DeliveryTier[], flatFee: number): DeliveryFeeResult {
  const sorted = tiers.length > 1 ? [...tiers].sort((a, b) => a.max_km - b.max_km) : tiers;
  for (const tier of sorted) {
    if (distanceKm <= tier.max_km) {
      return { fee: tier.fee, tier, isFallback: false };
    }
  }
  // Beyond every configured tier — caller decides whether to reject; the
  // returned fee is the highest tier so any display still shows a number.
  const last = sorted[sorted.length - 1];
  if (last) return { fee: last.fee, tier: last, isFallback: false };
  return { fee: flatFee, tier: null, isFallback: true };
}
