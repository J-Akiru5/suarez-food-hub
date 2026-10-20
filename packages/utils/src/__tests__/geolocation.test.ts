import { describe, expect, it } from "vitest";
import { formatGeolocationAccuracy, geolocationErrorMessage } from "../geolocation";

describe("geolocationErrorMessage", () => {
  it("explains permission denial and offers the manual fallback", () => {
    expect(geolocationErrorMessage(1)).toMatch(/permission was denied/i);
    expect(geolocationErrorMessage(1)).toMatch(/manually/i);
  });

  it("explains unavailable location services", () => {
    expect(geolocationErrorMessage(2)).toMatch(/could not determine a location/i);
    expect(geolocationErrorMessage(2)).toMatch(/manually/i);
  });

  it("explains timeouts", () => {
    expect(geolocationErrorMessage(3)).toMatch(/timed out/i);
    expect(geolocationErrorMessage(3)).toMatch(/manually/i);
  });

  it("falls back to a generic, actionable message", () => {
    expect(geolocationErrorMessage(undefined)).toMatch(/manually/i);
    expect(geolocationErrorMessage(99)).toMatch(/manually/i);
  });
});

describe("formatGeolocationAccuracy", () => {
  it("formats metres and kilometres", () => {
    expect(formatGeolocationAccuracy(25)).toBe("±25 m");
    expect(formatGeolocationAccuracy(1234)).toBe("±1.2 km");
  });

  it("returns null for missing or invalid accuracy", () => {
    expect(formatGeolocationAccuracy(null)).toBeNull();
    expect(formatGeolocationAccuracy(undefined)).toBeNull();
    expect(formatGeolocationAccuracy(0)).toBeNull();
    expect(formatGeolocationAccuracy(Number.NaN)).toBeNull();
  });
});
