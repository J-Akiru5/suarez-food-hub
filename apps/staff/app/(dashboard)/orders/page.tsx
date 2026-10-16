"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getOrdersWithProfiles } from "@repo/data-access/data/orders";
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
import { formatCurrency, parseServerDate } from "@repo/utils";
import { CheckCircle2, Eye, UserPlus } from "lucide-react";
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
  { value: "awaiting_rider", label: "Awaiting Rider" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  awaiting_rider: "bg-amber-100 text-amber-800",
  claimed_by_rider: "bg-teal-100 text-teal-800",
  near_customer: "bg-cyan-100 text-cyan-800",
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
  const fetchOrders = useCallback(async () => {
    const data = await getOrdersWithProfiles(supabaseRef.current, {
      status: activeTab !== "all" ? activeTab : undefined,
      hideUnverifiedGcash: true,
    });
    setOrders((data as OrderWithProfile[]) || []);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    // Periodic poll as fallback every 15 seconds
    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchOrders]);

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

                      {/* Rider Assignment — inline on card face */}
                      {[
                        "awaiting_rider",
                        "ready_for_pickup",
                        "claimed_by_rider",
                        "out_for_delivery",
                        "near_customer",
                      ].includes(order.status) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-1">Rider</p>
                          {order.rider_id && order.rider ? (
                            <div
                              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                                order.status === "awaiting_rider"
                                  ? "text-amber-700 bg-amber-50"
                                  : "text-green-700 bg-green-50"
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span className="font-medium">
                                {order.rider.first_name} {order.rider.last_name}
                              </span>
                              <span className="text-xs opacity-70">
                                {order.status === "awaiting_rider" ? "awaiting response" : "accepted"}
                              </span>
                              <Link href="/dispatch" className="ml-auto text-xs underline opacity-70 hover:opacity-100">
                                Dispatch
                              </Link>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-400 flex-1">
                                {order.status === "awaiting_rider" ? "Rider queue reassigning…" : "No rider assigned"}
                              </p>
                              <Link href="/dispatch">
                                <Button size="sm" className="gap-1 shrink-0">
                                  <UserPlus className="h-3 w-3" />
                                  Assign in Dispatch
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Kitchen Status — inline on card face */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
