"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { Badge, Card, CardContent } from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import { ArrowDownRight, ArrowUpRight, Bike, DollarSign, Package, ShoppingBag, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "@/lib/use-toast";

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  totalProducts: number;
  activeRiders: number;
  ordersTrend: number;
  revenueTrend: number;
}

interface ChartData {
  date: string;
  revenue: number;
  orders: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  profile?: { first_name: string; last_name: string } | null;
}

interface TopProduct {
  name: string;
  totalQuantity: number;
  totalRevenue: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function DashboardPage() {
  const supabase = createBrowserTypedClient();
  const [stats, setStats] = useState<DashboardStats>({
    todayOrders: 0,
    todayRevenue: 0,
    totalProducts: 0,
    activeRiders: 0,
    ordersTrend: 0,
    revenueTrend: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartMode, setChartMode] = useState<"weekly" | "monthly">("weekly");
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [chartMode]);

  async function fetchDashboardData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString();

    try {
      const [todayOrdersRes, yesterdayOrdersRes, productsRes, ridersRes, ordersRes, orderItemsRes] = await Promise.all([
        supabase.from("orders").select("id, total", { count: "exact" }).gte("created_at", todayISO),
        supabase
          .from("orders")
          .select("id, total", { count: "exact" })
          .gte("created_at", yesterdayISO)
          .lt("created_at", todayISO),
        supabase.from("products").select("id", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }).eq("role", "rider"),
        supabase
          .from("orders")
          .select(
            "id, order_number, total, status, created_at, profile:profiles!orders_user_id_fkey(first_name, last_name)",
          )
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("order_items").select("quantity, unit_price, product:products!order_items_product_id_fkey(name)"),
      ]);

      const todayOrders = todayOrdersRes.data || [];
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const yesterdayOrders = yesterdayOrdersRes.data || [];
      const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      const ordersTrend =
        yesterdayOrders.length > 0
          ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100
          : todayOrders.length > 0
            ? 100
            : 0;

      const revenueTrend =
        yesterdayRevenue > 0
          ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
          : todayRevenue > 0
            ? 100
            : 0;

      setStats({
        todayOrders: todayOrders.length,
        todayRevenue,
        totalProducts: productsRes.count || 0,
        activeRiders: ridersRes.count || 0,
        ordersTrend: Math.round(ordersTrend),
        revenueTrend: Math.round(revenueTrend),
      });

      setRecentOrders((ordersRes.data || []) as unknown as RecentOrder[]);

      const items = (orderItemsRes.data || []) as any[];
      const productMap = new Map<string, TopProduct>();
      items.forEach((item) => {
        const name = item.product?.name || "Unknown";
        const existing = productMap.get(name) || { name, totalQuantity: 0, totalRevenue: 0 };
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.unit_price * item.quantity;
        productMap.set(name, existing);
      });
      setTopProducts(
        Array.from(productMap.values())
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5),
      );
    } catch {
      toast({ title: "Failed to load dashboard data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function fetchChartData() {
    const now = new Date();
    const days = chartMode === "weekly" ? 7 : 30;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
      .from("orders")
      .select("total, created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at");

    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().split("T")[0], { revenue: 0, orders: 0 });
    }

    (orders || []).forEach((o) => {
      const key = o.created_at.split("T")[0];
      const existing = dailyMap.get(key);
      if (existing) {
        existing.revenue += o.total || 0;
        existing.orders += 1;
      }
    });

    setChartData(
      Array.from(dailyMap.entries()).map(([date, val]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: val.revenue,
        orders: val.orders,
      })),
    );
  }

  const currencyFormatter = (value: number) => `${formatCurrency(value)}`;

  const statCards = [
    {
      label: "Today's Orders",
      value: stats.todayOrders,
      trend: stats.ordersTrend,
      icon: ShoppingBag,
      color: "bg-brand-100 text-brand-600",
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      trend: stats.revenueTrend,
      icon: DollarSign,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Total Products",
      value: stats.totalProducts,
      trend: null,
      icon: Package,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Active Riders",
      value: stats.activeRiders,
      trend: null,
      icon: Bike,
      color: "bg-orange-100 text-orange-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your business operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    {stat.trend !== null && (
                      <div
                        className={`flex items-center gap-1 mt-1 text-xs font-medium ${stat.trend >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {stat.trend >= 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(stat.trend)}% vs yesterday
                      </div>
                    )}
                  </div>
                  <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-500" />
              <h2 className="font-bold text-lg font-display">Revenue Trend</h2>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setChartMode("weekly")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === "weekly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setChartMode("monthly")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMode === "monthly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={currencyFormatter} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-lg mb-4 font-display">Recent Orders</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.profile ? `${order.profile.first_name} ${order.profile.last_name}` : "Customer"}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold">{formatCurrency(order.total)}</p>
                      <span
                        className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold text-lg mb-4 font-display">Best Selling Products</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((product, idx) => (
                  <div key={product.name} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.totalQuantity} sold</p>
                    </div>
                    <p className="text-sm font-bold shrink-0">{formatCurrency(product.totalRevenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
