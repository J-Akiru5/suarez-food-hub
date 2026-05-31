"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@repo/ui";
import { Button } from "@repo/ui";
import {
  Bike,
  MapPin,
  Package,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import type { Profile } from "@repo/types";

interface RiderWithStats extends Profile {
  activeDeliveries: number;
  totalDeliveries: number;
  location?: { latitude: number; longitude: number } | null;
}

export default function RidersPage() {
  const supabase = createClient();
  const [riders, setRiders] = useState<RiderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<RiderWithStats | null>(null);

  const fetchRiders = useCallback(async () => {
    const { data: riderProfiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "rider")
      .order("created_at");

    const ridersList = (riderProfiles as Profile[]) || [];

    const ridersWithStats = await Promise.all(
      ridersList.map(async (rider) => {
        const [activeRes, totalRes, locationRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("rider_id", rider.user_id)
            .in("status", ["confirmed", "preparing", "out_for_delivery"]),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("rider_id", rider.user_id)
            .eq("status", "delivered"),
          supabase
            .from("rider_locations")
            .select("latitude, longitude")
            .eq("rider_id", rider.user_id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single(),
        ]);

        return {
          ...rider,
          activeDeliveries: activeRes.count || 0,
          totalDeliveries: totalRes.count || 0,
          location: locationRes.data || null,
        };
      })
    );

    setRiders(ridersWithStats as RiderWithStats[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  useEffect(() => {
    const channel = supabase
      .channel("riders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rider_locations" },
        () => {
          fetchRiders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchRiders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Riders</h1>
        <p className="text-sm text-muted-foreground">
          Manage and track delivery riders
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : riders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bike className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No riders registered</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {riders.map((rider) => (
            <Card
              key={rider.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedRider?.id === rider.id ? "ring-2 ring-brand-500" : ""
              }`}
              onClick={() =>
                setSelectedRider(
                  selectedRider?.id === rider.id ? null : rider
                )
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                    {rider.first_name?.[0]}
                    {rider.last_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm">
                      {rider.first_name} {rider.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {rider.phone || "No phone"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600">
                      <Package className="h-3 w-3" />
                      <span className="text-lg font-bold">
                        {rider.activeDeliveries}
                      </span>
                    </div>
                    <p className="text-[10px] text-orange-600">Active</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-lg font-bold">
                        {rider.totalDeliveries}
                      </span>
                    </div>
                    <p className="text-[10px] text-green-600">Completed</p>
                  </div>
                </div>

                {rider.location && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {rider.location.latitude.toFixed(4)},{" "}
                      {rider.location.longitude.toFixed(4)}
                    </span>
                  </div>
                )}

                {!rider.location && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="h-3 w-3" />
                    <span>Location unavailable</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rider Detail / Map */}
      {selectedRider && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold mb-3">
              {selectedRider.first_name} {selectedRider.last_name} - Location
            </h2>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              {selectedRider.location ? (
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-brand-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">
                    Lat: {selectedRider.location.latitude.toFixed(6)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Lng: {selectedRider.location.longitude.toFixed(6)}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No location data available
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
