import { calculateDistance } from "@repo/utils";

// Single source of truth for the Haversine distance — shared with the
// web app's distance-based delivery fee (packages/utils/src/delivery.ts).
export { calculateDistance };

export interface Position {
  lat: number;
  lng: number;
}

export function getCurrentPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}

export function watchPosition(callback: (position: Position) => void): number {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser.");
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (_error) => {
      // Silently ignore geolocation errors - GPS may not be available
      // (e.g. desktop without GPS, user denied permission, etc.)
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    },
  );
}
