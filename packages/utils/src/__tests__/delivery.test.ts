import { describe, expect, it } from "vitest";
import {
  calculateDistance,
  DEFAULT_FLAT_FEE,
  type DeliveryTier,
  deliveryEstimateKey,
  feeForDistance,
  isValidCoordinatePair,
  isValidCoordinates,
  maxDeliveryKm,
  parseDeliveryTiers,
} from "../delivery";

const TIERS: DeliveryTier[] = [
  { max_km: 2, fee: 20 },
  { max_km: 5, fee: 40 },
  { max_km: 10, fee: 70 },
  { max_km: 15, fee: 120 },
];

describe("calculateDistance", () => {
  it("returns 0 for identical points", () => {
    expect(calculateDistance(10.95, 122.5, 10.95, 122.5)).toBe(0);
  });

  it("approximates known Janiuay → Iloilo City distance (~28 km)", () => {
    // Janiuay (store) to Iloilo City proper
    const km = calculateDistance(10.9501875, 122.5065625, 10.7202, 122.5621);
    expect(km).toBeGreaterThan(25);
    expect(km).toBeLessThan(32);
  });

  it("is symmetric", () => {
    const a = calculateDistance(10.72, 122.56, 10.95, 122.5);
    const b = calculateDistance(10.95, 122.5, 10.72, 122.56);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("parseDeliveryTiers", () => {
  it("parses and sorts valid tiers ascending", () => {
    const raw = [
      { max_km: 10, fee: 70 },
      { max_km: 2, fee: 20 },
    ];
    expect(parseDeliveryTiers(raw)).toEqual([
      { max_km: 2, fee: 20 },
      { max_km: 10, fee: 70 },
    ]);
  });

  it("drops invalid entries", () => {
    const raw = [{ max_km: 2, fee: 20 }, { max_km: -1, fee: 10 }, null, "junk", { max_km: 5 }, { fee: 10 }];
    expect(parseDeliveryTiers(raw)).toEqual([{ max_km: 2, fee: 20 }]);
  });

  it("returns [] for non-arrays (null JSONB)", () => {
    expect(parseDeliveryTiers(null)).toEqual([]);
    expect(parseDeliveryTiers(undefined)).toEqual([]);
    expect(parseDeliveryTiers("nope")).toEqual([]);
  });

  it("coerces string numbers (JSONB sometimes round-trips as strings)", () => {
    expect(parseDeliveryTiers([{ max_km: "3", fee: "25" }])).toEqual([{ max_km: 3, fee: 25 }]);
  });
});

describe("feeForDistance", () => {
  it("prices the tier containing the distance (boundary inclusive)", () => {
    expect(feeForDistance(0, TIERS, 40).fee).toBe(20);
    expect(feeForDistance(2, TIERS, 40).fee).toBe(20);
    expect(feeForDistance(2.1, TIERS, 40).fee).toBe(40);
    expect(feeForDistance(5, TIERS, 40).fee).toBe(40);
    expect(feeForDistance(9.9, TIERS, 40).fee).toBe(70);
    expect(feeForDistance(15, TIERS, 40).fee).toBe(120);
  });

  it("returns the highest tier fee beyond max (caller checks outOfRange separately)", () => {
    const r = feeForDistance(50, TIERS, 40);
    expect(r.fee).toBe(120);
    expect(r.tier?.max_km).toBe(15);
  });

  it("falls back to the flat fee with no tiers", () => {
    const r = feeForDistance(3, [], 40);
    expect(r.fee).toBe(40);
    expect(r.tier).toBeNull();
    expect(r.isFallback).toBe(true);
  });

  it("handles unsorted tier input", () => {
    const unsorted = [
      { max_km: 10, fee: 70 },
      { max_km: 2, fee: 20 },
    ];
    expect(feeForDistance(1.5, unsorted, 40).fee).toBe(20);
  });

  it("DEFAULT_FLAT_FEE is the historical ₱40", () => {
    expect(DEFAULT_FLAT_FEE).toBe(40);
  });
});

describe("maxDeliveryKm", () => {
  it("is the last tier's max_km", () => {
    expect(maxDeliveryKm(TIERS)).toBe(15);
  });
  it("is null with no tiers", () => {
    expect(maxDeliveryKm([])).toBeNull();
  });
});

describe("isValidCoordinates", () => {
  it("accepts finite in-range latitude/longitude", () => {
    expect(isValidCoordinates(10.9501875, 122.5065625)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);
    expect(isValidCoordinates(0, 0)).toBe(true);
  });

  it("rejects non-finite, out-of-range and non-number values", () => {
    expect(isValidCoordinates(Number.NaN, 122.5)).toBe(false);
    expect(isValidCoordinates(10.95, Number.POSITIVE_INFINITY)).toBe(false);
    expect(isValidCoordinates(91, 122.5)).toBe(false);
    expect(isValidCoordinates(10.95, -181)).toBe(false);
    expect(isValidCoordinates("10.95", "122.5")).toBe(false);
    expect(isValidCoordinates(null, undefined)).toBe(false);
  });

  it("validates an object pin shape", () => {
    expect(isValidCoordinatePair({ lat: 10.95, lng: 122.5 })).toBe(true);
    expect(isValidCoordinatePair({ lat: 10.95 })).toBe(false);
    expect(isValidCoordinatePair({ lat: "10.95", lng: 122.5 })).toBe(false);
    expect(isValidCoordinatePair(null)).toBe(false);
  });
});

describe("deliveryEstimateKey", () => {
  it("uses a stable pin key and changes when the pin moves", () => {
    const a = deliveryEstimateKey({ lat: 10.9501875, lng: 122.5065625 }, "063023000");
    const b = deliveryEstimateKey({ lat: 10.9501881, lng: 122.5065631 }, "063023000");
    const c = deliveryEstimateKey({ lat: 10.9502, lng: 122.5066 }, "063023000");
    expect(a).toBe("pin:10.950188,122.506563");
    expect(b).toBe(a);
    expect(c).not.toBe(a);
  });

  it("falls back to the town key without a pin, and to 'none' without either", () => {
    expect(deliveryEstimateKey(null, "063023000")).toBe("town:063023000");
    expect(deliveryEstimateKey({ lat: 200, lng: 500 }, "063023000")).toBe("town:063023000");
    expect(deliveryEstimateKey(null, null)).toBe("none");
  });
});

describe("reference delivery scenario (live pricing rules)", () => {
  // Live business.delivery_tiers on 2026-10-20 (admin-configured).
  const LIVE_TIERS: DeliveryTier[] = [
    { max_km: 1, fee: 30 },
    { max_km: 3, fee: 45 },
    { max_km: 5, fee: 60 },
    { max_km: 7, fee: 75 },
    { max_km: 9, fee: 90 },
    { max_km: 10, fee: 105 },
    { max_km: 11, fee: 120 },
    { max_km: 12, fee: 135 },
    { max_km: 20, fee: 255 },
  ];

  it("prices the screenshot's 3.9 km at ₱60 and keeps subtotal + fee = total", () => {
    const fee = feeForDistance(3.9, LIVE_TIERS, 20).fee;
    expect(fee).toBe(60);
    const subtotal = 350;
    expect(subtotal + fee).toBe(410);
  });

  it("uses the 5 km tier at the boundary and the next tier just beyond it", () => {
    expect(feeForDistance(5, LIVE_TIERS, 20).fee).toBe(60);
    expect(feeForDistance(5.01, LIVE_TIERS, 20).fee).toBe(75);
  });
});

describe("invalid distance handling", () => {
  it("falls back to the flat fee instead of pricing NaN/negative distances at the top tier", () => {
    for (const distance of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      const result = feeForDistance(distance, TIERS, 40);
      expect(result.fee).toBe(40);
      expect(result.isFallback).toBe(true);
      expect(result.tier).toBeNull();
    }
  });
});
