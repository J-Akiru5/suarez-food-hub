"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getOrdersWithProfiles } from "@repo/data-access/data/orders";
import { getAvailableRiders } from "@repo/data-access/data/profiles";
import type { Order, Profile } from "@repo/types";
import {
  Button,
  Card,
  CardContent,
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
import { formatCurrency } from "@repo/utils";
import { ChevronDown, ChevronUp, Eye, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
  const supabase = createBrowserTypedClient();
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [riders, setRiders] = useState<Profile[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const data = await getOrdersWithProfiles(supabase, {
      status: activeTab !== "all" ? activeTab : undefined,
    });
    setOrders((data as OrderWithProfile[]) || []);
    setLoading(false);
  }, [activeTab, supabase]);

  const fetchRiders = useCallback(async () => {
    // Include all currently assigned rider IDs so dropdown doesn't break
    const assignedIds = orders.map((o) => o.rider_id).filter(Boolean) as string[];
    const data = await getAvailableRiders(supabase, assignedIds);
    setRiders((data as Profile[]) || []);
  }, [supabase, orders]);

  useEffect(() => {
    fetchOrders();
    fetchRiders();
  }, [fetchOrders, fetchRiders]);

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrders]);

  async function assignRider(orderId: string, riderId: string, currentStatus?: string) {
    const updates: Record<string, any> = { rider_id: riderId };
    // Don't regress kitchen status - only set to confirmed if still pending/confirmed
    if (!currentStatus || currentStatus === "pending" || currentStatus === "confirmed") {
      updates.status = "confirmed";
    }
    await supabase.from("orders").update(updates).eq("id", orderId);
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

  async function updatePaymentStatus(orderId: string, payment_status: string) {
    await supabase.from("orders").update({ payment_status }).eq("id", orderId);
    fetchOrders();
  }

  function needsAttention(order: OrderWithProfile) {
    return (
      order.payment_status !== "verified" ||
      order.status === "pending" ||
      order.status === "confirmed"
    );
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
                <Card
                  key={order.id}
                  className={urgent ? "border-red-300 ring-1 ring-red-200" : ""}
                >
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
                          {new Date(order.created_at).toLocaleString()}
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

                          {/* Assign Rider */}
                          {order.status !== "cancelled" && order.status !== "delivered" && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                {order.rider_id ? "Reassign Rider" : "Assign Rider"}
                              </p>
                              <Select
                                value={order.rider_id || undefined}
                                onValueChange={(value) => assignRider(order.id, value, order.status)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue
                                    placeholder={riders.length === 0 ? "No riders available" : "Select rider"}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {riders.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                      No riders available
                                    </SelectItem>
                                  ) : (
                                    riders.map((rider) => (
                                      <SelectItem key={rider.id} value={rider.id}>
                                        {rider.first_name || rider.full_name} {rider.last_name || ""}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Status Actions */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Payment Status</p>
                              <Select
                                value={order.payment_status}
                                onValueChange={(value) => updatePaymentStatus(order.id, value)}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Select payment status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="verified">Verified</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Order Status</p>
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
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );})}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
