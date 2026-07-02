"use client";

import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { calculateDistance, getCurrentPosition } from "@/lib/geolocation";

const riderIcon = new L.DivIcon({
  className: "rider-marker",
  html: `<div style="background:#b85c38;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const destinationIcon = new L.DivIcon({
  className: "destination-marker",
  html: `<div style="background:#1a1a1a;width:28px;height:28px;border-radius:8px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface DeliveryMapProps {
  destinationLat: number;
  destinationLng: number;
  destinationLabel: string;
  onDistanceChange?: (km: number) => void;
}

function MapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      const bounds = L.latLngBounds(positions.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
}

export default function DeliveryMap({
  destinationLat,
  destinationLng,
  destinationLabel,
  onDistanceChange,
}: DeliveryMapProps) {
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => setRiderPos([pos.lat, pos.lng]))
      .catch(() => setRiderPos([10.3157, 123.8854]));

    const id = navigator.geolocation.watchPosition(
      (pos) => setRiderPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const positions: [number, number][] = riderPos
    ? [riderPos, [destinationLat, destinationLng]]
    : [[destinationLat, destinationLng]];
  const center: [number, number] = riderPos || [destinationLat, destinationLng];

  useEffect(() => {
    if (riderPos && onDistanceChange) {
      const dist = calculateDistance(riderPos[0], riderPos[1], destinationLat, destinationLng);
      onDistanceChange(dist);
    }
  }, [riderPos, destinationLat, destinationLng, onDistanceChange]);

  return (
    <div className="h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer center={center} zoom={14} className="h-full w-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds positions={positions} />
        {riderPos && (
          <>
            <Marker position={riderPos} icon={riderIcon}>
              <Popup>You are here</Popup>
            </Marker>
            <Polyline
              positions={[riderPos, [destinationLat, destinationLng]]}
              color="#b85c38"
              weight={3}
              opacity={0.5}
              dashArray="8 8"
            />
          </>
        )}
        <Marker position={[destinationLat, destinationLng]} icon={destinationIcon}>
          <Popup>{destinationLabel}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
