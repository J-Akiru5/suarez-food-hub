"use client";

import { Badge, Button, Card, CardContent } from "@repo/ui";
import { format } from "date-fns";
import { CheckCircle, ChefHat, Clock, Loader2, MapPin, Package, Phone, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const statusFlow: Record<string, { next: string | null; label: string | null; color: string }> = {
  pending: { next: "confirmed", label: "Accept Order", color: "bg-blue-600" },
  confirmed: { next: "preparing", label: "Start Preparing", color: "bg-purple-600" },
  preparing: { next: "ready_for_pickup", label: "Mark Ready", color: "bg-indigo-600" },
  ready_for_pickup: { next: null, label: null, color: "" },
  claimed_by_rider: { next: null, label: null, color: "" },
  out_for_delivery: { next: null, label: null, color: "" },
  near_customer: { next: null, label: null, color: "" },
  delivered: { next: null, label: null, color: "" },
  cancelled: { next: null, label: null, color: "" },
};

const tabs = [
  { value: "active", label: "Active Kitchen" },
  { value: "ready", label: "Ready for Pickup" },
  { value: "delivered", label: "Completed" },
];

export default function StaffOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    let statusFilter: string[] = [];
    if (activeTab === "active") {
      statusFilter = ["pending", "confirmed", "preparing"];
    } else if (activeTab === "ready") {
      statusFilter = ["ready_for_pickup", "claimed_by_rider"];
    } else {
      statusFilter = ["delivered", "cancelled"];
    }

    const { data } = await supabase
      .from("orders")
      .select(`
        *,
        customer:profiles!orders_user_id_fkey(first_name, last_name, phone),
        items:order_items(quantity, product_name, variant_name, special_instructions, product:products!order_items_product_id_fkey(name, image_url))
      `)
      .in("status", statusFilter)
      .order("created_at", { ascending: false });

    setOrders(data || []);
    setLoading(false);
  }, [activeTab, supabase]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("staff-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, supabase]);

  async function advanceStatus(orderId: string, currentStatus: string) {
    const next = statusFlow[currentStatus]?.next;
    if (!next) return;
    setUpdating(orderId);
    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: next }),
      });
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-muted-foreground">Kitchen workflow management</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchOrders();
          }}
        >
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.value
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-muted-foreground">No orders in this queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const customer = order.customer;
            const customerName = customer
              ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Customer"
              : "Customer";
            const flow = statusFlow[order.status];
            const isExpanded = expandedOrder === order.id;
            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-gray-500">
                          #{order.order_number?.slice(0, 8) || order.id.slice(0, 8)}
                        </span>
                        <Badge
                          className={
                            order.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.status === "confirmed"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "preparing"
                                  ? "bg-purple-100 text-purple-800"
                                  : order.status === "ready_for_pickup"
                                    ? "bg-indigo-100 text-indigo-800"
                                    : order.status === "delivered"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                          }
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(order.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{customerName}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Phone size={12} /> {customer?.phone || order.delivery_contact}
                      </p>
                      <button
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        className="text-xs text-brand-600 font-medium mt-2 hover:underline"
                      >
                        {isExpanded ? "Hide" : "View"} {order.items?.length || 0} item
                        {order.items?.length !== 1 ? "s" : ""}
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">₱{Number(order.total).toFixed(2)}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {order.payment_method} · {order.payment_status}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {order.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            <span className="font-medium">{item.quantity}x</span>{" "}
                            {item.product_name || item.product?.name}
                            {item.variant_name && <span className="text-xs text-gray-500"> ({item.variant_name})</span>}
                          </span>
                          <span className="text-gray-600">₱{Number(item.unit_price).toFixed(2)}</span>
                        </div>
                      ))}
                      {order.delivery_notes && (
                        <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                          <strong>Note:</strong> {order.delivery_notes}
                        </div>
                      )}
                    </div>
                  )}

                  {flow?.label && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Button
                        onClick={() => advanceStatus(order.id, order.status)}
                        disabled={updating === order.id}
                        className={`w-full ${flow.color} hover:opacity-90 text-white`}
                      >
                        {updating === order.id ? (
                          <Loader2 size={14} className="animate-spin mr-2" />
                        ) : (
                          <CheckCircle size={14} className="mr-2" />
                        )}
                        {flow.label}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
