"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { getCurrentPosition } from "@/lib/geolocation";

const riderIcon = new L.DivIcon({
  className: "rider-marker",
  html: `<div style="background:#b1454a;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destinationIcon = new L.DivIcon({
  className: "destination-marker",
  html: `<div style="background:#9a3a3e;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface DeliveryMapProps {
  destinationLat: number;
  destinationLng: number;
  destinationLabel: string;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function DeliveryMap({
  destinationLat,
  destinationLng,
  destinationLabel,
}: DeliveryMapProps) {
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => setRiderPos([pos.lat, pos.lng]))
      .catch(() => setRiderPos([10.3157, 123.8854]));

    const id = navigator.geolocation.watchPosition(
      (pos) => setRiderPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const center: [number, number] = riderPos || [10.3157, 123.8854];

  return (
    <div className="h-48 rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={center}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} />
        {riderPos && (
          <Marker position={riderPos} icon={riderIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        <Marker position={[destinationLat, destinationLng]} icon={destinationIcon}>
          <Popup>{destinationLabel}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
