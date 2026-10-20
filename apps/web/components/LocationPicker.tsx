"use client";

import { Button } from "@repo/ui";
import { formatGeolocationAccuracy, geolocationErrorMessage, isValidCoordinates } from "@repo/utils";
import { Crosshair, Loader2, MapPin, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Dynamically import MapComponent to prevent SSR issues with Leaflet
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-gray-100 animate-pulse rounded-lg flex flex-col items-center justify-center border border-dashed border-gray-300">
      <MapPin className="h-8 w-8 text-gray-400 mb-2" />
      <span className="text-sm font-medium text-gray-500">Loading Map...</span>
    </div>
  ),
});

interface LocationPickerProps {
  position: { lat: number; lng: number } | null;
  setPosition: (pos: { lat: number; lng: number } | null) => void;
  readOnly?: boolean;
  /** Reverse-geocoded label for the current pin (informational). */
  onAddressDetect?: (address: string) => void;
  /** Where the pin came from — GPS or a manual map interaction. */
  onPositionSourceChange?: (source: "gps" | "map" | null) => void;
  /** Map centre before a pin is selected (restaurant origin by default). */
  defaultCenter?: { lat: number; lng: number } | null;
  /** Restaurant origin marker (not the customer pin). */
  storePosition?: { lat: number; lng: number } | null;
}

export default function LocationPicker({
  position,
  setPosition,
  readOnly = false,
  onAddressDetect,
  onPositionSourceChange,
  defaultCenter,
  storePosition,
}: LocationPickerProps) {
  const [detecting, setDetecting] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [detectedAddress, setDetectedAddress] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState(false);

  // Increments on every user-driven pin change. A pending geolocation result
  // captured an older version and must not overwrite the newer manual choice.
  const manualVersionRef = useRef(0);
  // Separate sequence for repeated Auto Detect taps (last request wins).
  const detectSeqRef = useRef(0);
  // Last-write-wins guard for the debounced reverse-geocode call.
  const geocodeSeqRef = useRef(0);
  const onAddressDetectRef = useRef(onAddressDetect);
  onAddressDetectRef.current = onAddressDetect;
  const onPositionSourceChangeRef = useRef(onPositionSourceChange);
  onPositionSourceChangeRef.current = onPositionSourceChange;

  const clearDetectedAddress = () => {
    setDetectedAddress("");
    setAddressLoading(false);
    setAddressError(false);
    onAddressDetectRef.current?.("");
  };

  const handleManualPosition = (next: { lat: number; lng: number }) => {
    // A manual choice always wins over a slower geolocation response.
    manualVersionRef.current += 1;
    detectSeqRef.current += 1;
    geocodeSeqRef.current += 1;
    setDetecting(false);
    setAccuracy(null);
    setErrorMessage("");
    clearDetectedAddress();
    onPositionSourceChangeRef.current?.("map");
    setPosition(next);
  };

  const handleClear = () => {
    manualVersionRef.current += 1;
    detectSeqRef.current += 1;
    geocodeSeqRef.current += 1;
    setDetecting(false);
    setAccuracy(null);
    setErrorMessage("");
    clearDetectedAddress();
    onPositionSourceChangeRef.current?.(null);
    setPosition(null);
  };

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      setErrorMessage("Geolocation is not supported by this browser. Set the pin manually on the map.");
      return;
    }

    const requestSeq = ++detectSeqRef.current;
    const manualVersion = manualVersionRef.current;
    setDetecting(true);
    setErrorMessage("");
    setAccuracy(null);
    clearDetectedAddress();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Ignore a response that lost the race to a manual selection or a
        // newer Auto Detect request.
        if (requestSeq !== detectSeqRef.current || manualVersion !== manualVersionRef.current) return;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!isValidCoordinates(lat, lng)) {
          setErrorMessage("The browser returned an invalid location. Set the pin manually on the map.");
          setDetecting(false);
          return;
        }

        setPosition({ lat, lng });
        setAccuracy(Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null);
        onPositionSourceChangeRef.current?.("gps");
        setDetecting(false);
      },
      (err) => {
        if (requestSeq !== detectSeqRef.current) return;
        setErrorMessage(geolocationErrorMessage(err.code));
        setDetecting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  // Keep an informational address label in sync with the selected pin.
  // Nominatim's usage policy asks for a low request rate, so debounce until the
  // pin settles and abort the previous lookup. A failed lookup never blocks the
  // pin or the fee — the coordinates stay authoritative.
  useEffect(() => {
    if (!position || !isValidCoordinates(position.lat, position.lng)) {
      setDetectedAddress("");
      setAddressLoading(false);
      setAddressError(false);
      onAddressDetectRef.current?.("");
      return;
    }

    const seq = ++geocodeSeqRef.current;
    const controller = new AbortController();
    setAddressLoading(true);
    setAddressError(false);

    const timer = setTimeout(async () => {
      try {
        const url =
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
          `&lat=${position.lat}&lon=${position.lng}&zoom=18&addressdetails=1&accept-language=en`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);
        const data = await res.json();
        if (seq !== geocodeSeqRef.current) return;
        const label = typeof data?.display_name === "string" ? data.display_name.trim() : "";
        if (label) {
          setDetectedAddress(label);
          onAddressDetectRef.current?.(label);
        } else {
          setAddressError(true);
        }
      } catch {
        if (controller.signal.aborted || seq !== geocodeSeqRef.current) return;
        setAddressError(true);
      } finally {
        if (seq === geocodeSeqRef.current) setAddressLoading(false);
      }
    }, 900);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [position]);

  const accuracyLabel = formatGeolocationAccuracy(accuracy);
  const approximate = accuracy != null && accuracy > 1000;

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold flex items-center gap-1.5 font-display text-gray-900">
            <MapPin className="h-4 w-4 text-brand-500" />
            Delivery Pin Location
          </h3>
          <div className="flex items-center gap-2">
            {position && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-[10px] sm:text-xs h-7 sm:h-8"
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                Remove Pin
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={detectLocation}
              disabled={detecting}
              className="text-[10px] sm:text-xs h-7 sm:h-8"
            >
              {detecting ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin text-brand-500" />
              ) : (
                <Crosshair className="h-3 w-3 mr-1.5" />
              )}
              {detecting ? "Locating..." : "Use My Current Location"}
            </Button>
          </div>
        </div>
      )}

      <div className="relative border border-gray-200 rounded-lg overflow-hidden isolate shadow-sm h-64 z-0">
        <MapComponent
          position={position}
          setPosition={handleManualPosition}
          readOnly={readOnly}
          defaultCenter={defaultCenter}
          storePosition={storePosition}
        />
        {!readOnly && !position && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-md">
            Tap the map to place your delivery pin, or use your current location.
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="space-y-1.5 text-xs">
          {detecting && (
            <p className="text-blue-700">
              Getting your device location… This uses GPS, not the typed address. Allow the browser permission if asked.
            </p>
          )}
          {!detecting && accuracyLabel && (
            <p className="text-emerald-700">
              Device location detected {accuracyLabel}.
              {approximate ? " It may be approximate — fine-tune the pin below." : ""}
            </p>
          )}
          {!detecting && addressLoading && <p className="text-slate-500">Looking up the detected address…</p>}
          {!detecting && !addressLoading && detectedAddress && (
            <p className="text-slate-600">Nearest address: {detectedAddress}</p>
          )}
          {!detecting && !addressLoading && addressError && (
            <p className="text-amber-700">Address lookup unavailable — please verify the pin on the map.</p>
          )}
          {errorMessage && <p className="text-red-600">{errorMessage}</p>}
          <p className="text-muted-foreground flex items-center gap-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
              i
            </span>
            Drag the pin, tap the map, or zoom to fine-tune. The delivery fee follows this pin.
          </p>
        </div>
      )}
    </div>
  );
}
