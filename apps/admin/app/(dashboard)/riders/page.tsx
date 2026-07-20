"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getRiderLocations } from "@repo/data-access/data/locations";
import { createNotification } from "@repo/data-access/data/notifications";
import { getCompletedOrdersCount, getOrdersCountForRider } from "@repo/data-access/data/orders";
import { getRiders, updateRiderStatus } from "@repo/data-access/data/profiles";
import type { Profile } from "@repo/types";
import { Button, Card, CardContent } from "@repo/ui";
import { Bike, Calendar, Car, CheckCircle, Mail, Package, Phone, User, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

interface RiderWithStats extends Profile {
  activeDeliveries: number;
  totalDeliveries: number;
  location?: { latitude: number; longitude: number } | null;
}

export default function RidersPage() {
  const supabase = createBrowserTypedClient();
  const [riders, setRiders] = useState<RiderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedRider, setSelectedRider] = useState<RiderWithStats | null>(null);

  const fetchRiders = useCallback(async () => {
    try {
      setErrorMsg("");
      const riderProfiles = await getRiders(supabase);
      const ridersList = (riderProfiles as Profile[]) || [];

      const ridersWithStats = await Promise.all(
        ridersList.map(async (rider) => {
          const [activeDeliveries, totalDeliveries, location] = await Promise.all([
            getOrdersCountForRider(supabase, rider.id, [
              "confirmed",
              "preparing",
              "ready_for_pickup",
              "claimed_by_rider",
              "out_for_delivery",
              "near_customer",
            ]),
            getCompletedOrdersCount(supabase, rider.id),
            getRiderLocations(supabase, rider.id),
          ]);

          return {
            ...rider,
            activeDeliveries,
            totalDeliveries,
            location: location || null,
          };
        }),
      );

      setRiders(ridersWithStats as RiderWithStats[]);
      setLoading(false);
    } catch (err: any) {
      console.error("fetchRiders error:", err);
      setErrorMsg(err.message || String(err));
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  useEffect(() => {
    const channel = supabase
      .channel("riders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_locations" }, () => {
        fetchRiders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchRiders]);

  async function approveRider(riderId: string, riderName: string) {
    const result = await Swal.fire({
      title: "Approve Rider?",
      text: `${riderName} will be able to accept deliveries.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, approve",
    });
    if (!result.isConfirmed) return;

    const { error } = await updateRiderStatus(supabase, riderId, "available", true);
    if (error) {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to approve rider. Please try again." });
      return;
    }
    await createNotification(supabase, {
      user_id: riderId,
      type: "rider_approved",
      title: "Welcome to the team!",
      message: "Your rider application has been approved. You can now accept deliveries.",
    });
    Swal.fire({
      icon: "success",
      title: "Approved!",
      text: `${riderName} has been approved.`,
      timer: 2000,
      showConfirmButton: false,
    });
    fetchRiders();
  }

  async function rejectRider(riderId: string, riderName: string) {
    const result = await Swal.fire({
      title: "Reject Rider?",
      text: `${riderName} will not be able to log in.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, reject",
    });
    if (!result.isConfirmed) return;

    const { error } = await updateRiderStatus(supabase, riderId, "rejected", false);
    if (error) {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to reject rider. Please try again." });
      return;
    }
    await createNotification(supabase, {
      user_id: riderId,
      type: "rider_rejected",
      title: "Application Update",
      message: "Unfortunately, your rider application was not approved. Please contact support.",
    });
    Swal.fire({
      icon: "success",
      title: "Rejected",
      text: `${riderName} has been rejected.`,
      timer: 2000,
      showConfirmButton: false,
    });
    fetchRiders();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Riders</h1>
        <p className="text-sm text-muted-foreground">Manage and track delivery riders</p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
          <strong>Error: </strong> {errorMsg}
        </div>
      )}

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
                selectedRider?.id === rider.id ? "ring-2 ring-crimson-500" : ""
              }`}
              onClick={() => setSelectedRider(selectedRider?.id === rider.id ? null : rider)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-crimson-100 flex items-center justify-center text-crimson-700 font-bold text-sm shrink-0">
                    {rider.first_name?.[0]}
                    {rider.last_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm">
                      {rider.first_name} {rider.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{rider.phone || "No phone"}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600">
                      <Package className="h-3 w-3" />
                      <span className="text-lg font-bold">{rider.activeDeliveries}</span>
                    </div>
                    <p className="text-[10px] text-orange-600">Active</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-lg font-bold">{rider.totalDeliveries}</span>
                    </div>
                    <p className="text-[10px] text-green-600">Completed</p>
                  </div>
                </div>

                {rider.rider_status === "pending_approval" && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        approveRider(rider.id, `${rider.first_name} ${rider.last_name}`);
                      }}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-600 border-red-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        rejectRider(rider.id, `${rider.first_name} ${rider.last_name}`);
                      }}
                    >
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1 text-xs">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      rider.rider_status === "available"
                        ? "bg-green-500"
                        : rider.rider_status === "occupied"
                          ? "bg-orange-500"
                          : rider.rider_status === "pending_approval"
                            ? "bg-yellow-500"
                            : "bg-gray-400"
                    }`}
                  />
                  <span className="text-gray-600">{rider.rider_status?.replace(/_/g, " ") || "—"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rider Detail */}
      {selectedRider && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-crimson-100 flex items-center justify-center text-crimson-700 font-bold text-lg shrink-0">
                  {selectedRider.first_name?.[0]}
                  {selectedRider.last_name?.[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display">
                    {selectedRider.first_name} {selectedRider.last_name}
                  </h2>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <span
                      className={`inline-flex h-2 w-2 rounded-full ${
                        selectedRider.rider_status === "available"
                          ? "bg-green-500"
                          : selectedRider.rider_status === "occupied"
                            ? "bg-orange-500"
                            : "bg-gray-400"
                      }`}
                    />
                    <span>{selectedRider.rider_status?.replace(/_/g, " ") || "—"}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRider(null)}
                className="h-8 w-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Contact</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>{selectedRider.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">{selectedRider.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>@{selectedRider.username || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Vehicle</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Car className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="capitalize">{selectedRider.vehicle_type || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Bike className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>Plate: {selectedRider.plate_number || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="h-4 w-4 text-gray-400 shrink-0 flex items-center justify-center text-[10px] font-bold">
                      L
                    </span>
                    <span>License: {selectedRider.license_number || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Performance</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-600">{selectedRider.activeDeliveries}</p>
                    <p className="text-xs text-orange-600">Active Deliveries</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{selectedRider.totalDeliveries}</p>
                    <p className="text-xs text-green-600">Total Completed</p>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Account</h3>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <span>
                    Member since{" "}
                    {selectedRider.created_at
                      ? new Date(selectedRider.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      selectedRider.is_active ? "bg-green-500" : "bg-red-400"
                    }`}
                  />
                  <span>{selectedRider.is_active ? "Account Active" : "Account Disabled"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
