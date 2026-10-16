import { describe, expect, it } from "vitest";
import {
  calculateDistance,
  DEFAULT_FLAT_FEE,
  type DeliveryTier,
  feeForDistance,
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
