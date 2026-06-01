"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@repo/ui";
import { Button } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import {
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { Order, Profile } from "@repo/types";

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
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

interface OrderWithProfile extends Order {
  profile?: Profile | null;
  items?: any[];
}

export default function OrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [riders, setRiders] = useState<Profile[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from("orders")
      .select(
        "*, profile:profiles!orders_user_id_fkey(first_name, last_name, phone, address), rider:profiles!orders_rider_id_fkey(first_name, last_name), items:order_items(quantity, unit_price, product:products!order_items_product_id_fkey(name))"
      )
      .order("created_at", { ascending: false });

    if (activeTab !== "all") {
      query = query.eq("status", activeTab);
    }

    const { data } = await query;
    setOrders((data as OrderWithProfile[]) || []);
    setLoading(false);
  }, [activeTab, supabase]);

  const fetchRiders = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "rider");
    setRiders((data as Profile[]) || []);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
    fetchRiders();
  }, [fetchOrders, fetchRiders]);

  useEffect(() => {
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrders]);

  async function assignRider(orderId: string, riderId: string) {
    await supabase
      .from("orders")
      .update({ rider_id: riderId, status: "confirmed" })
      .eq("id", orderId);
    fetchOrders();
  }

  async function updateStatus(orderId: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    fetchOrders();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all orders
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchOrders()}
          className="gap-2"
        >
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
              {orders.map((order) => (
                <Card key={order.id}>
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
                            {order.payment_status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.profile
                            ? `${order.profile.first_name} ${order.profile.last_name}`
                            : "Customer"}
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
                        onClick={() =>
                          setExpandedOrder(
                            expandedOrder === order.id ? null : order.id
                          )
                        }
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
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              Items
                            </p>
                            {order.items?.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {item.product?.name || "Product"} x{item.quantity}
                                </span>
                                <span>
                                  {formatCurrency(item.unit_price * item.quantity)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t">
                              <span>Total</span>
                              <span>{formatCurrency(order.total)}</span>
                            </div>
                          </div>

                          {/* Delivery Address */}
                          <div>
                            <p className="text-xs font-medium text-gray-500">
                              Delivery Address
                            </p>
                            <p className="text-sm">{order.delivery_address}</p>
                          </div>

                          {/* Assign Rider */}
                          {!order.rider_id && order.status !== "cancelled" && order.status !== "delivered" && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                Assign Rider
                              </p>
                              <Select
                                onValueChange={(value) => assignRider(order.id, value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select rider" />
                                </SelectTrigger>
                                <SelectContent>
                                  {riders.map((rider) => (
                                    <SelectItem key={rider.id} value={rider.user_id || rider.id}>
                                      {rider.first_name || rider.full_name} {rider.last_name || ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Status Actions */}
                          {order.status !== "cancelled" && order.status !== "delivered" && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                Update Status
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {order.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(order.id, "confirmed")}
                                  >
                                    Confirm
                                  </Button>
                                )}
                                {order.status === "confirmed" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(order.id, "preparing")}
                                  >
                                    Preparing
                                  </Button>
                                )}
                                {order.status === "preparing" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(order.id, "out_for_delivery")}
                                  >
                                    Out for Delivery
                                  </Button>
                                )}
                                {order.status === "out_for_delivery" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(order.id, "delivered")}
                                  >
                                    Delivered
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => updateStatus(order.id, "cancelled")}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
