"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { isValidCoordinates } from "@repo/utils";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

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

const storeIcon = new L.DivIcon({
  className: "store-marker",
  html: `<div style="background:#b1454a;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:800;">S</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
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
  storeLat,
  storeLng,
}: Props) {
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);
  const [storePos, setStorePos] = useState<[number, number] | null>(
    isValidCoordinates(storeLat, storeLng) ? [storeLat as number, storeLng as number] : null,
  );
  const supabase = useMemo(() => createBrowserTypedClient(), []);

  // Do not fall back to an arbitrary city centre: if the caller did not pass
  // the restaurant origin, read it from the authoritative business config.
  useEffect(() => {
    if (isValidCoordinates(storeLat, storeLng)) {
      setStorePos([storeLat as number, storeLng as number]);
      return;
    }
    let cancelled = false;
    fetch("/api/business")
      .then((r) => r.json())
      .then((response) => {
        const biz = response?.data || response;
        if (!cancelled && isValidCoordinates(biz?.base_lat, biz?.base_lng)) {
          setStorePos([Number(biz.base_lat), Number(biz.base_lng)]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storeLat, storeLng]);

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

  const center: [number, number] = riderPos ?? storePos ?? [destinationLat, destinationLng];

  return (
    <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
      <MapContainer {...({ center, zoom: 14, zoomControl: false } as any)} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater center={center} />
        {storePos && (
          <Marker {...({ position: storePos, icon: storeIcon } as any)}>
            <Popup>Suarez Food Hub</Popup>
          </Marker>
        )}
        {riderPos && (
          <Marker {...({ position: riderPos, icon: riderIcon } as any)}>
            <Popup>Rider is here</Popup>
          </Marker>
        )}
        <Marker {...({ position: [destinationLat, destinationLng], icon: destinationIcon } as any)}>
          <Popup>{destinationLabel}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
