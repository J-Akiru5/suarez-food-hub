"use client";

import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { createClient } from "@/lib/supabase/client";

const riderIcon = new L.DivIcon({
  className: "rider-marker",
  html: `<div style="background:#b1454a;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="background:white;width:6px;height:6px;border-radius:50%"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const destinationIcon = new L.DivIcon({
  className: "destination-marker",
  html: `<div style="background:#1a1a2e;width:24px;height:24px;border-radius:4px 4px 4px 0;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><div style="background:white;width:6px;height:6px;border-radius:50%"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

interface Props {
  riderId: string | null;
  destinationLat: number;
  destinationLng: number;
  destinationLabel: string;
  storeLat?: number;
  storeLng?: number;
}

export default function CustomerDeliveryMap({
  riderId,
  destinationLat,
  destinationLng,
  destinationLabel,
  storeLat = 10.3157,
  storeLng = 123.8854,
}: Props) {
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!riderId) return;

    fetch(`/api/locations?rider_id=${riderId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.latitude && d?.longitude) setRiderPos([d.latitude, d.longitude]);
      })
      .catch(() => {});

    const channel = supabase
      .channel(`rider-location-${riderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rider_locations",
          filter: `rider_id=eq.${riderId}`,
        },
        (payload) => {
          const loc = payload.new as any;
          if (loc?.latitude && loc?.longitude) setRiderPos([loc.latitude, loc.longitude]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderId, supabase]);

  const defaultCenter: [number, number] = [storeLat, storeLng];
  const center: [number, number] = riderPos || defaultCenter;

  return (
    <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
      <MapContainer center={center} zoom={14} className="h-full w-full" zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater center={center} />
        {riderPos && (
          <Marker position={riderPos} icon={riderIcon}>
            <Popup>Rider is here</Popup>
          </Marker>
        )}
        <Marker position={[destinationLat, destinationLng]} icon={destinationIcon}>
          <Popup>{destinationLabel}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
