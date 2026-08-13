"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getOrdersWithProfiles } from "@repo/data-access/data/orders";
import { getAvailableRiders } from "@repo/data-access/data/profiles";
import type { Order, Profile } from "@repo/types";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui";
import { formatCurrency, parseServerDate } from "@repo/utils";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Eye, RefreshCw, Send, UserPlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

const statusTabs = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

const kitchenOptions = ["confirmed", "preparing", "ready_for_pickup", "cancelled"];

interface OrderWithProfile extends Order {
  profile?: Profile | null;
  items?: any[];
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-48 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
}

function OrdersPageContent() {
  const supabaseRef = useRef(createBrowserTypedClient());
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const statusFromUrl = searchParams.get("status");
  const initialTab =
    statusFromUrl && statusTabs.find((t) => t.value === statusFromUrl.replace(/ /g, "_"))
      ? statusFromUrl.replace(/ /g, "_")
      : "all";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [riders, setRiders] = useState<Profile[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteOrderId, setInviteOrderId] = useState<string | null>(null);
  const [selectedRiderIds, setSelectedRiderIds] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  const fetchOrders = useCallback(async () => {
    const data = await getOrdersWithProfiles(supabaseRef.current, {
      status: activeTab !== "all" ? activeTab : undefined,
    });
    setOrders((data as OrderWithProfile[]) || []);
    setLoading(false);
  }, [activeTab]);

  const fetchRiders = useCallback(async () => {
    // Include all currently assigned rider IDs so dropdown doesn't break
    const assignedIds = orders.map((o) => o.rider_id).filter(Boolean) as string[];
    const data = await getAvailableRiders(supabaseRef.current, assignedIds);
    setRiders((data as Profile[]) || []);
  }, [orders]);

  useEffect(() => {
    fetchOrders();
    fetchRiders();
  }, [fetchOrders, fetchRiders]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
        fetchRiders();
      })
      .subscribe();

    // Periodic poll as fallback every 15 seconds
    const pollInterval = setInterval(() => {
      fetchOrders();
      fetchRiders();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchOrders, fetchRiders]);

  function openInviteModal(orderId: string) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    setInviteOrderId(orderId);
    // Pre-select currently pending riders
    const pendingIds = (order as any).pending_riders || [];
    const existing = pendingIds.filter((id: string) => riders.find((r) => r.id === id));
    setSelectedRiderIds(existing);
    setInviteModalOpen(true);
  }

  function toggleRiderSelection(riderId: string) {
    setSelectedRiderIds((prev) => (prev.includes(riderId) ? prev.filter((id) => id !== riderId) : [...prev, riderId]));
  }

  async function sendInvitations() {
    if (!inviteOrderId || selectedRiderIds.length === 0) return;
    setSendingInvites(true);
    try {
      // Only set pending_riders — kitchen status is NOT changed here
      await supabaseRef.current
        .from("orders")
        .update({
          pending_riders: selectedRiderIds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inviteOrderId);

      // Notify each invited rider
      const notifications = selectedRiderIds.map((riderId: string) => ({
        user_id: riderId,
        type: "delivery_invitation",
        title: "New Delivery Available",
        message: "A new order is ready for pickup. First to accept gets it!",
        data: { order_id: inviteOrderId },
      }));
      await supabaseRef.current.from("notifications").insert(notifications);
    } catch (err) {
      console.error("Failed to send invitations:", err);
      Swal.fire({ icon: "error", title: "Failed", text: "Could not assign riders. Please check console for details." });
    }
    setSendingInvites(false);
    setInviteModalOpen(false);
    fetchOrders();
  }

  async function updateStatus(orderId: string, status: string) {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status }),
      });
      const data = await res.json();
      if (!data.success) {
        console.error("Status update failed:", data.error);
        Swal.fire({ icon: "error", title: "Error", text: data.error || "Unknown error" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      console.error("Status update error:", message);
      Swal.fire({ icon: "error", title: "Error", text: "Network error while updating order. Please try again." });
    }
    fetchOrders();
  }

  function needsAttention(order: OrderWithProfile) {
    return order.payment_status !== "verified" || order.status === "pending" || order.status === "confirmed";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Orders</h1>
          <p className="text-sm text-muted-foreground">Manage and track all orders</p>
        </div>
        <Button variant="outline" onClick={() => fetchOrders()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const urgent = needsAttention(order);
                return (
                  <Card key={order.id} className={urgent ? "border-red-300 ring-1 ring-red-200" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-sm">{order.order_number}</p>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                statusColors[order.status] || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {order.status.replace(/_/g, " ")}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                paymentColors[order.payment_status] || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              Payment: {order.payment_status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {order.profile ? `${order.profile.first_name} ${order.profile.last_name}` : "Customer"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {parseServerDate(order.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold">{formatCurrency(order.total)}</p>
                          <div className="flex gap-1 mt-2">
                            <Link href={`/orders/${order.id}`}>
                              <Button variant="outline" size="sm" className="gap-1">
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          className="flex items-center gap-1 text-xs text-crimson-600 font-medium hover:text-crimson-700"
                        >
                          {expandedOrder === order.id ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          {expandedOrder === order.id ? "Hide" : "Show"} details
                        </button>

                        {expandedOrder === order.id && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                            {/* Order Items */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Items</p>
                              {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm">
                                  <span>
                                    {item.product?.name || "Product"} x{item.quantity}
                                  </span>
                                  <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t">
                                <span>Total</span>
                                <span>{formatCurrency(order.total)}</span>
                              </div>
                            </div>

                            {/* Delivery Address */}
                            <div>
                              <p className="text-xs font-medium text-gray-500">Delivery Address</p>
                              <p className="text-sm">{order.delivery_address}</p>
                            </div>

                            {/* Rider Assignment — only shown when order is ready for pickup or beyond */}
                            {["ready_for_pickup", "claimed_by_rider", "out_for_delivery", "near_customer"].includes(
                              order.status,
                            ) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Rider Status</p>
                                {order.rider_id && order.rider ? (
                                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    <span className="font-medium">
                                      {order.rider.first_name} {order.rider.last_name}
                                    </span>
                                    <span className="text-xs text-green-500">accepted</span>
                                    <button
                                      onClick={() => openInviteModal(order.id)}
                                      className="ml-auto text-xs text-gray-500 hover:text-gray-700 underline"
                                    >
                                      Reassign
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      {(order as any).pending_riders?.length > 0 ? (
                                        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg flex-1">
                                          <Clock className="h-4 w-4 shrink-0" />
                                          <span>
                                            Awaiting acceptance from {(order as any).pending_riders.length} rider
                                            {(order as any).pending_riders.length > 1 ? "s" : ""}
                                          </span>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-400 flex-1">No riders invited yet</p>
                                      )}
                                      <Button
                                        size="sm"
                                        onClick={() => openInviteModal(order.id)}
                                        className="gap-1 shrink-0"
                                      >
                                        <UserPlus className="h-3 w-3" />
                                        Assign
                                      </Button>
                                    </div>
                                    {/* Show invited rider names */}
                                    {(order as any).pending_riders?.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {(order as any).pending_riders.map((riderId: string) => {
                                          const rider = riders.find((r) => r.id === riderId);
                                          return rider ? (
                                            <span
                                              key={riderId}
                                              className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                                            >
                                              {rider.first_name || rider.full_name}
                                            </span>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Kitchen Status */}
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Kitchen Status</p>
                              <Select
                                value={kitchenOptions.includes(order.status) ? order.status : undefined}
                                onValueChange={(value) => updateStatus(order.id, value)}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Update kitchen status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="confirmed">Confirm</SelectItem>
                                  <SelectItem value="preparing">Start Preparing</SelectItem>
                                  <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                                  <SelectItem value="cancelled" className="text-red-600">
                                    Cancel Order
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Riders Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Riders</DialogTitle>
            <DialogDescription>Select riders to notify. First to accept gets the delivery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {riders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No riders available</p>
            ) : (
              riders.map((rider) => {
                const isSelected = selectedRiderIds.includes(rider.id);
                return (
                  <button
                    key={rider.id}
                    type="button"
                    onClick={() => toggleRiderSelection(rider.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-brand-500 border-brand-500 text-white" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {rider.first_name || rider.full_name} {rider.last_name || ""}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{rider.rider_status?.replace(/_/g, " ")}</p>
                    </div>
                    {rider.vehicle_type && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        {rider.vehicle_type}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendInvitations}
              disabled={selectedRiderIds.length === 0 || sendingInvites}
              className="gap-2"
            >
              {sendingInvites ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to {selectedRiderIds.length} rider{selectedRiderIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
