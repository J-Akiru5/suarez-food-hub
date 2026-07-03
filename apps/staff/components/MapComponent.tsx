"use client";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapProps {
  position: { lat: number; lng: number } | null;
  setPosition: (pos: { lat: number; lng: number }) => void;
  className?: string;
  readOnly?: boolean;
}

export default function MapComponent({ position, setPosition, className, readOnly }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: position || { lat: 14.5995, lng: 120.9842 },
      zoom: position ? 16 : 12,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!readOnlyRef.current) {
        setPosition(e.latlng);
      }
    });

    map.on("locationfound", (e: L.LocationEvent) => {
      if (!readOnlyRef.current) {
        setPosition(e.latlng);
        map.flyTo(e.latlng, 16);
      }
    });

    map.whenReady(() => {
      map.invalidateSize();
      setReady(true);
    });

    mapRef.current = map;

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, [position, setPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (position) {
      markerRef.current = L.marker(position, { icon }).addTo(map);
      map.setView(position, Math.max(map.getZoom(), 16));
    }
  }, [position?.lat, position?.lng, position]);

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
