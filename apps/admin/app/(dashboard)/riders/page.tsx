"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getRiderLocations } from "@repo/data-access/data/locations";
import { createNotification } from "@repo/data-access/data/notifications";
import { getCompletedOrdersCount, getOrdersCountForRider, getOrdersForRider } from "@repo/data-access/data/orders";
import { getRiders, updateRiderStatus } from "@repo/data-access/data/profiles";
import type { Profile } from "@repo/types";
import { Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui";
import { parseServerDate } from "@repo/utils";
import {
  Bike,
  Calendar,
  Car,
  CheckCircle,
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  Package,
  Phone,
  ShieldAlert,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

interface RiderWithStats extends Profile {
  activeDeliveries: number;
  totalDeliveries: number;
  location?: { latitude: number; longitude: number } | null;
  recentOrders?: { id: string; order_number: string; status: string; total: number; created_at: string }[];
}

const ACTIVE_STATUSES = [
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "claimed_by_rider",
  "out_for_delivery",
  "near_customer",
];

export default function RidersPage() {
  const supabase = createBrowserTypedClient();
  const [riders, setRiders] = useState<RiderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  // Details modal state
  const [selectedRider, setSelectedRider] = useState<RiderWithStats | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchRiders = useCallback(async () => {
    try {
      setErrorMsg("");
      const riderProfiles = await getRiders(supabase);
      const ridersList = (riderProfiles as Profile[]) || [];

      const ridersWithStats = await Promise.all(
        ridersList.map(async (rider) => {
          const [activeDeliveries, totalDeliveries, location] = await Promise.all([
            getOrdersCountForRider(supabase, rider.id, ACTIVE_STATUSES as never),
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("fetchRiders error:", err);
      setErrorMsg(message);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  // Realtime — refresh instantly when a rider's location OR profile status changes
  useEffect(() => {
    const channel = supabase
      .channel("riders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_locations" }, () => {
        fetchRiders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (payload) => {
        const changed = payload.new as { role?: string } | null;
        // Only refresh when a rider's profile changed (approve/reject/offline/resign)
        if (changed && changed.role === "rider") fetchRiders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchRiders]);

  const openRiderDetails = useCallback(
    async (rider: RiderWithStats) => {
      setSelectedRider(rider);
      setModalOpen(true);
      setLoadingOrders(true);
      try {
        const recentOrders = await getOrdersForRider(supabase, rider.id);
        setSelectedRider((prev) =>
          prev
            ? {
                ...prev,
                recentOrders: (recentOrders as RiderWithStats["recentOrders"]) || [],
              }
            : prev,
        );
      } catch {
        // Non-fatal — modal still opens with stats
      } finally {
        setLoadingOrders(false);
      }
    },
    [supabase],
  );

  function refreshSelectedRider(patch: Partial<RiderWithStats>) {
    setSelectedRider((prev) => (prev ? { ...prev, ...patch } : prev));
    fetchRiders();
  }

  async function approveRider(rider: RiderWithStats) {
    const result = await Swal.fire({
      title: "Approve Rider?",
      text: `${rider.first_name} ${rider.last_name} will be able to accept deliveries.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, approve",
    });
    if (!result.isConfirmed) return;

    const { error } = await updateRiderStatus(supabase, rider.id, "available", true);
    if (error) {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to approve rider. Please try again." });
      return;
    }
    await createNotification(supabase, {
      user_id: rider.id,
      type: "rider_approved",
      title: "Welcome to the team!",
      message: "Your rider application has been approved. You can now accept deliveries.",
    });
    Swal.fire({
      icon: "success",
      title: "Approved!",
      text: `${rider.first_name} ${rider.last_name} has been approved.`,
      timer: 2000,
      showConfirmButton: false,
    });
    refreshSelectedRider({ rider_status: "available" as never, is_active: true });
  }

  async function rejectRider(rider: RiderWithStats) {
    const result = await Swal.fire({
      title: "Reject Rider?",
      text: `${rider.first_name} ${rider.last_name} will not be able to log in.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, reject",
    });
    if (!result.isConfirmed) return;

    const { error } = await updateRiderStatus(supabase, rider.id, "rejected", false);
    if (error) {
      Swal.fire({ icon: "error", title: "Error", text: "Failed to reject rider. Please try again." });
      return;
    }
    await createNotification(supabase, {
      user_id: rider.id,
      type: "rider_rejected",
      title: "Application Update",
      message: "Unfortunately, your rider application was not approved. Please contact support.",
    });
    Swal.fire({
      icon: "success",
      title: "Rejected",
      text: `${rider.first_name} ${rider.last_name} has been rejected.`,
      timer: 2000,
      showConfirmButton: false,
    });
    refreshSelectedRider({ rider_status: "rejected" as never, is_active: false });
  }

  async function markResigned(rider: RiderWithStats) {
    const result = await Swal.fire({
      title: "Mark as Resigned?",
      text: `${rider.first_name} ${rider.last_name} will no longer receive delivery assignments.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, mark as resigned",
    });
    if (!result.isConfirmed) return;
    // Route through the server API (service role) so the resign always applies
    // — the previous direct client-side update could silently no-op if RLS on
    // profiles was missing/stale in the live DB.
    const res = await fetch("/api/riders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rider.id, rider_status: "resigned", is_active: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      Swal.fire({ icon: "error", title: "Error", text: data.error || "Failed to mark rider as resigned" });
    } else {
      Swal.fire({
        icon: "success",
        title: "Resigned",
        text: "Rider marked as resigned.",
        timer: 1500,
        showConfirmButton: false,
      });
      refreshSelectedRider({ rider_status: "resigned" as never, is_active: false });
    }
  }

  async function deleteRider(rider: RiderWithStats) {
    const result = await Swal.fire({
      title: "Delete Rider?",
      text: `${rider.first_name} ${rider.last_name} will be permanently removed. This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete permanently",
    });
    if (!result.isConfirmed) return;
    // Server-side delete removes BOTH the auth user and the profile row (the
    // profiles FK doesn't cascade from auth.users, so a client-only profile
    // delete would orphan the auth user and let them keep logging in).
    const res = await fetch(`/api/riders?id=${encodeURIComponent(rider.id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      Swal.fire({ icon: "error", title: "Error", text: data.error || "Failed to delete rider" });
    } else {
      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Rider deleted permanently.",
        timer: 1500,
        showConfirmButton: false,
      });
      setModalOpen(false);
      setSelectedRider(null);
      fetchRiders();
    }
  }

  const statusDotClass = (status: string | null | undefined) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "occupied":
        return "bg-orange-500";
      case "pending_approval":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-400";
      case "resigned":
        return "bg-red-400";
      default:
        return "bg-gray-400";
    }
  };

  const rider = selectedRider;
  const isResigned = rider?.rider_status === "resigned";

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
          {riders.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group"
              onClick={() => openRiderDetails(r)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-crimson-100 flex items-center justify-center text-crimson-700 font-bold text-sm shrink-0">
                    {r.first_name?.[0]}
                    {r.last_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm">
                      {r.first_name} {r.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{r.phone || "No phone"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-crimson-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600">
                      <Package className="h-3 w-3" />
                      <span className="text-lg font-bold">{r.activeDeliveries}</span>
                    </div>
                    <p className="text-[10px] text-orange-600">Active</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-lg font-bold">{r.totalDeliveries}</span>
                    </div>
                    <p className="text-[10px] text-green-600">Completed</p>
                  </div>
                </div>

                {r.rider_status === "pending_approval" && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        approveRider(r);
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
                        rejectRider(r);
                      }}
                    >
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1 text-xs">
                  <span className={`inline-flex h-2 w-2 rounded-full ${statusDotClass(r.rider_status)}`} />
                  <span className="text-gray-600 capitalize">{r.rider_status?.replace(/_/g, " ") || "—"}</span>
                  <span className="ml-auto text-[10px] text-gray-400 group-hover:text-crimson-500 transition-colors">
                    View details →
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rider Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {rider && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">Rider Details</DialogTitle>
              </DialogHeader>

              {/* Header row */}
              <div className="flex items-center justify-between pr-8">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-crimson-100 flex items-center justify-center text-crimson-700 font-bold text-lg shrink-0">
                    {rider.first_name?.[0]}
                    {rider.last_name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-display">
                      {rider.first_name} {rider.last_name}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          rider.rider_status === "available"
                            ? "bg-green-500"
                            : rider.rider_status === "occupied"
                              ? "bg-orange-500"
                              : rider.rider_status === "pending_approval"
                                ? "bg-yellow-500"
                                : rider.rider_status === "resigned"
                                  ? "bg-red-400"
                                  : "bg-gray-400"
                        }`}
                      />
                      <span className="capitalize">{rider.rider_status?.replace(/_/g, " ") || "—"}</span>
                    </div>
                  </div>
                </div>
                {isResigned && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Resigned
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Contact</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>{rider.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="truncate">{rider.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>@{rider.username || "—"}</span>
                    </div>
                  </div>
                </div>
                {/* Vehicle Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Vehicle</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Car className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="capitalize">{rider.vehicle_type || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Bike className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>Plate: {rider.plate_number || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="h-4 w-4 text-gray-400 shrink-0 flex items-center justify-center text-[10px] font-bold">
                        L
                      </span>
                      <span>License: {rider.license_number || "—"}</span>
                    </div>
                  </div>

                  {rider.valid_id_url && (
                    <div className="pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Valid ID</h4>
                      <a
                        href={rider.valid_id_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative h-32 w-full max-w-[200px] rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-brand-500 transition-all"
                      >
                        <img
                          src={rider.valid_id_url}
                          alt="Valid ID"
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </a>
                      <p className="text-[10px] text-gray-400 mt-1">Click to view full size</p>
                    </div>
                  )}
                </div>
                {/* Stats */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Performance</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-orange-600">{rider.activeDeliveries}</p>
                      <p className="text-xs text-orange-600">Active Deliveries</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{rider.totalDeliveries}</p>
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
                      {rider.created_at
                        ? parseServerDate(rider.created_at).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className={`inline-flex h-2.5 w-2.5 rounded-full ${rider.is_active ? "bg-green-500" : "bg-red-400"}`}
                    />
                    <span>{rider.is_active ? "Account Active" : "Account Disabled"}</span>
                  </div>
                </div>
              </div>

              {/* Recent orders */}
              {loadingOrders ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-crimson-600" />
                </div>
              ) : rider.recentOrders && rider.recentOrders.length > 0 ? (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Recent Orders</h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {rider.recentOrders.slice(0, 10).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <span className="font-medium">#{order.order_number || order.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-xs text-gray-500 capitalize">{order.status.replace(/_/g, " ")}</span>
                        <span className="font-bold">₱{Number(order.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Recent Orders</h3>
                  <p className="text-sm text-gray-400">No orders yet</p>
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Actions</h3>
                <div className="flex gap-2 flex-wrap">
                  {rider.rider_status === "pending_approval" && (
                    <>
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        onClick={() => approveRider(rider)}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-200 gap-2"
                        onClick={() => rejectRider(rider)}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  {!isResigned && rider.rider_status !== "pending_approval" && rider.rider_status !== "rejected" && (
                    <Button
                      variant="outline"
                      className="text-amber-600 border-amber-200 hover:bg-amber-50 gap-2"
                      onClick={() => markResigned(rider)}
                    >
                      <LogOut className="h-4 w-4" />
                      Mark as Resigned
                    </Button>
                  )}
                  {isResigned && (
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
                      onClick={() => deleteRider(rider)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Rider
                    </Button>
                  )}
                </div>
                {isResigned && (
                  <p className="text-xs text-gray-500 mt-3">
                    This rider has resigned. You can delete their account permanently — the rider will no longer be able
                    to log in or appear in assignment lists.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
