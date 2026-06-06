"use client";

import { Card, CardContent } from "@repo/ui";
import { CheckCircle, ChevronRight, Clock, Package, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createBrowserTypedClient } from "@repo/data-access/client";

export default function StaffDashboard() {
  const supabase = createBrowserTypedClient();
  const [stats, setStats] = useState({
    pending: 0,
    preparing: 0,
    readyForPickup: 0,
    completedToday: 0,
    lowStock: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const [pendingRes, preparingRes, readyRes, completedRes, lowStockRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "preparing"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "ready_for_pickup"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered")
        .gte("delivered_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from("products")
        .select("id, quantity, buffer_quantity", { count: "exact" })
        .eq("availability", "available"),
    ]);

    const lowStockItems = (lowStockRes.data || []).filter((p: any) => (p.quantity ?? 0) <= (p.buffer_quantity ?? 5));

    setStats({
      pending: pendingRes.count || 0,
      preparing: preparingRes.count || 0,
      readyForPickup: readyRes.count || 0,
      completedToday: completedRes.count || 0,
      lowStock: lowStockItems.length,
    });

    const { data: recent } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, total, created_at, customer:profiles!orders_user_id_fkey(first_name, last_name)",
      )
      .in("status", ["pending", "confirmed", "preparing", "ready_for_pickup"])
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentOrders(recent || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel("staff-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchStats())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats, supabase]);

  const tiles = [
    { label: "Pending", value: stats.pending, icon: Clock, color: "yellow" },
    { label: "Preparing", value: stats.preparing, icon: Package, color: "purple" },
    { label: "Ready for Pickup", value: stats.readyForPickup, icon: CheckCircle, color: "indigo" },
    { label: "Completed Today", value: stats.completedToday, icon: TrendingUp, color: "green" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="text-sm text-muted-foreground">Kitchen operations overview</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Card key={tile.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Icon size={16} />
                    <span className="text-xs font-medium">{tile.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{tile.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {stats.lowStock > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
            <Package className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              {stats.lowStock} product{stats.lowStock > 1 ? "s" : ""} low on stock
            </p>
            <p className="text-xs text-red-600">Check the inventory page to restock.</p>
          </div>
          <Link href="/inventory" className="text-sm text-red-700 font-medium hover:underline">
            View
          </Link>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Active Orders</h2>
            <Link href="/orders" className="text-xs text-brand-600 font-medium flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No active orders right now.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((o) => {
                const c = o.customer;
                const name = c ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Customer" : "Customer";
                return (
                  <Link
                    key={o.id}
                    href={`/orders?id=${o.id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        #{o.order_number?.slice(0, 8) || o.id.slice(0, 8)} · {name}
                      </p>
                      <p className="text-xs text-gray-500">₱{Number(o.total).toFixed(2)}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 capitalize">
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
