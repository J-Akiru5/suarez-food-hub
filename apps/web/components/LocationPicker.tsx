"use client";

import { Button } from "@repo/ui";
import { Crosshair, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

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
  setPosition: (pos: { lat: number; lng: number }) => void;
  readOnly?: boolean;
  onAddressDetect?: (address: string) => void;
}

export default function LocationPicker({
  position,
  setPosition,
  readOnly = false,
  onAddressDetect,
}: LocationPickerProps) {
  const [detecting, setDetecting] = useState(false);

  const detectLocation = () => {
    setDetecting(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (onAddressDetect) {
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
              );
              const data = await res.json();
              if (data && data.display_name) {
                onAddressDetect(data.display_name);
              }
            } catch (err) {
              console.error("Reverse geocoding failed", err);
            }
          }
          setDetecting(false);
        },
        () => {
          alert("Could not detect location automatically. Please select it manually on the map.");
          setDetecting(false);
        },
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setDetecting(false);
    }
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-1.5 font-display text-gray-900">
            <MapPin className="h-4 w-4 text-brand-500" />
            Delivery Pin Location
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detectLocation}
            disabled={detecting}
            className="text-[10px] sm:text-xs h-7 sm:h-8"
          >
            <Crosshair className={`h-3 w-3 mr-1.5 ${detecting ? "animate-spin text-brand-500" : ""}`} />
            {detecting ? "Locating..." : "Auto Detect"}
          </Button>
        </div>
      )}

      <div className="relative border border-gray-200 rounded-lg overflow-hidden isolate shadow-sm h-64 z-0">
        <MapComponent position={position} setPosition={setPosition} readOnly={readOnly} />
      </div>

      {!readOnly && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
            i
          </span>
          Drag the map or click anywhere to accurately place your delivery pin.
        </p>
      )}
    </div>
  );
}
