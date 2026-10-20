"use client";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

/**
 * Leaflet map for choosing the delivery pin.
 *
 * The map is created ONCE per mount. Pin changes only add/move the marker, so
 * dragging or tapping does not destroy/recreate the map (which used to reload
 * every tile and reset the zoom on each pin move).
 */

const deliveryPinIcon = L.divIcon({
  className: "sfh-delivery-pin",
  html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M15 1C7.3 1 1 7.3 1 15c0 10.4 14 26 14 26s14-15.6 14-26C29 7.3 22.7 1 15 1z" fill="#b1454a" stroke="#ffffff" stroke-width="2"/>
    <circle cx="15" cy="15" r="5.5" fill="#ffffff"/>
  </svg>`,
  iconSize: [30, 42],
  iconAnchor: [15, 41],
  popupAnchor: [0, -38],
});

const storeIcon = L.divIcon({
  className: "sfh-store-pin",
  html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M14 1C6.8 1 1 6.8 1 14c0 9.3 13 21 13 21s13-11.7 13-21C27 6.8 21.2 1 14 1z" fill="#1a1a2e" stroke="#ffffff" stroke-width="2"/>
    <path d="M8 11h12v3H8zm1 3h10v7H9z" fill="#ffffff"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 35],
  popupAnchor: [0, -32],
});

// Viewport fallback only (Iloilo City). It is never used as a delivery pin.
const FALLBACK_CENTER = { lat: 10.7202, lng: 122.5621 };

interface MapProps {
  position: { lat: number; lng: number } | null;
  setPosition: (pos: { lat: number; lng: number }) => void;
  className?: string;
  readOnly?: boolean;
  /** Map centre when no pin is selected. Defaults to the restaurant origin. */
  defaultCenter?: { lat: number; lng: number } | null;
  /** Restaurant origin marker (not the customer destination). */
  storePosition?: { lat: number; lng: number } | null;
}

export default function MapComponent({
  position,
  setPosition,
  className,
  readOnly,
  defaultCenter,
  storePosition,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const storeMarkerRef = useRef<L.Marker | null>(null);
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const setPositionRef = useRef(setPosition);
  setPositionRef.current = setPosition;
  const defaultCenterRef = useRef(defaultCenter ?? FALLBACK_CENTER);
  defaultCenterRef.current = defaultCenter ?? FALLBACK_CENTER;
  const initialCenterRef = useRef(position ?? defaultCenter ?? FALLBACK_CENTER);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const center = initialCenterRef.current;
    const map = L.map(container, {
      center: [center.lat, center.lng],
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!readOnlyRef.current) {
        setPositionRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    map.whenReady(() => {
      map.invalidateSize();
      setReady(true);
    });

    mapRef.current = map;

    return () => {
      storeMarkerRef.current?.remove();
      storeMarkerRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Customer delivery pin. Draggable so the customer can fine-tune without
  // tapping a slightly different spot on the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRef.current?.remove();
    markerRef.current = null;

    if (!position) {
      map.setView([defaultCenterRef.current.lat, defaultCenterRef.current.lng], 12, { animate: true });
      return;
    }

    const marker = L.marker([position.lat, position.lng], {
      icon: deliveryPinIcon,
      draggable: !readOnly,
      autoPan: true,
      keyboard: true,
      bubblingMouseEvents: false,
      title: "Your delivery pin",
    }).addTo(map);

    marker.on("dragend", () => {
      const next = marker.getLatLng();
      setPositionRef.current({ lat: next.lat, lng: next.lng });
    });

    markerRef.current = marker;
    map.setView([position.lat, position.lng], Math.max(map.getZoom(), 16), { animate: true });
  }, [position?.lat, position?.lng, readOnly, position]);

  // Restaurant origin marker (reference only — not a customer pin).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    storeMarkerRef.current?.remove();
    storeMarkerRef.current = null;

    const lat = storePosition?.lat;
    const lng = storePosition?.lng;
    if (lat != null && lng != null) {
      storeMarkerRef.current = L.marker([lat, lng], {
        icon: storeIcon,
        interactive: true,
        keyboard: false,
        bubblingMouseEvents: false,
        title: "Suarez Food Hub",
      })
        .addTo(map)
        .bindPopup("Suarez Food Hub — delivery starts here");
    }
  }, [storePosition?.lat, storePosition?.lng]);

  // If the authoritative centre arrives after the map mounted (business config
  // fetch), recentre only while there is no customer pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || position) return;
    const lat = defaultCenter?.lat ?? FALLBACK_CENTER.lat;
    const lng = defaultCenter?.lng ?? FALLBACK_CENTER.lng;
    map.setView([lat, lng], 12, { animate: true });
  }, [defaultCenter?.lat, defaultCenter?.lng, position]);

  return (
    <div ref={containerRef} className={className || "h-64 w-full z-0"} style={{ minHeight: "100%" }}>
      {!ready && (
        <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400 text-sm">
          Loading map...
        </div>
      )}
    </div>
  );
}
