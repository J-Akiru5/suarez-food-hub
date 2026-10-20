/**
 * Browser geolocation error copy.
 *
 * `GeolocationPositionError.code` is a small, stable enum:
 *   1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.
 * Keeping the mapping pure makes it testable and keeps the map component
 * focused on UI.
 */
export function geolocationErrorMessage(code: number | null | undefined): string {
  switch (code) {
    case 1:
      return "Location permission was denied. Allow location access in your browser, or set the pin manually on the map.";
    case 2:
      return "Your device could not determine a location. Check that location services are on, or set the pin manually on the map.";
    case 3:
      return "Location detection timed out. Try again, or set the pin manually on the map.";
    default:
      return "Could not detect your location. Set the pin manually on the map.";
  }
}

/** Human-readable accuracy, e.g. 25 m / 1.2 km. */
export function formatGeolocationAccuracy(accuracyMeters: number | null | undefined): string | null {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters) || accuracyMeters <= 0) return null;
  if (accuracyMeters < 1000) return `±${Math.round(accuracyMeters)} m`;
  return `±${(accuracyMeters / 1000).toFixed(1)} km`;
}
