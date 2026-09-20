"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getOrdersWithProfiles } from "@repo/data-access/data/orders";
import type { Order, Profile } from "@repo/types";
import { Button, Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui";
import { formatCurrency, parseServerDate } from "@repo/utils";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const statusTabs = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
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

interface OrderWithProfile extends Order {
  profile?: Profile | null;
  // biome-ignore lint/suspicious/noExplicitAny: Order items shape
  items?: any[];
}

export default function OrdersPage() {
  const supabase = createBrowserTypedClient();
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const fetchOrders = useCallback(async () => {
    const data = await getOrdersWithProfiles(supabase, {
      status: activeTab !== "all" ? activeTab : undefined,
    });
    setOrders((data as OrderWithProfile[]) || []);
    setLoading(false);
  }, [activeTab, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [supabase, fetchOrders]);

  function needsAttention(order: OrderWithProfile) {
    return (
      order.payment_status !== "verified" ||
      order.status === "pending" ||
      (!order.rider_id && order.status !== "cancelled" && order.status !== "delivered")
    );
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
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
