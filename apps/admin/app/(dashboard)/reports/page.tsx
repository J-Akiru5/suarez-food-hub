"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { Button, Card, CardContent } from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from "date-fns";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  FileBarChart,
  Loader2,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import PdfReport from "./pdf-report";

interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  itemsSold: number;
  dailyBreakdown: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
}

type Preset = "today" | "week" | "month" | "last_month" | "custom";

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("week");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportData, setReportData] = useState<ReportData>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    itemsSold: 0,
    dailyBreakdown: [],
    topProducts: [],
  });

  function getDateRange(p: Preset): { from: string; to: string } {
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");

    switch (p) {
      case "today":
        return { from: today, to: today };
      case "week": {
        const start = startOfWeek(now, { weekStartsOn: 1 });
        return { from: format(start, "yyyy-MM-dd"), to: today };
      }
      case "month": {
        const start = startOfMonth(now);
        return { from: format(start, "yyyy-MM-dd"), to: today };
      }
      case "last_month": {
        const lastMonth = subDays(startOfMonth(now), 1);
        return {
          from: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
          to: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
        };
      }
      case "custom":
        return { from: dateFrom || today, to: dateTo || today };
      default:
        return { from: today, to: today };
    }
  }

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const range = getDateRange(preset);
    const from = `${range.from}T00:00:00`;
    const to = `${range.to}T23:59:59`;

    const [ordersRes, itemsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total, status, created_at")
        .gte("created_at", from)
        .lte("created_at", to)
        .neq("status", "cancelled"),
      supabase
        .from("order_items")
        .select("quantity, unit_price, product:products!order_items_product_id_fkey(name)")
        .gte("created_at", from)
        .lte("created_at", to),
    ]);

    const orders = ordersRes.data || [];
    const items = (itemsRes.data || []) as any[];

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const itemsSold = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Daily breakdown
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < daysDiff; i++) {
      const d = new Date(fromDate);
      d.setDate(d.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      dailyMap.set(key, { revenue: 0, orders: 0 });
    }

    orders.forEach((o) => {
      const key = o.created_at.split("T")[0];
      const existing = dailyMap.get(key);
      if (existing) {
        existing.revenue += o.total || 0;
        existing.orders += 1;
      }
    });

    const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, val]) => ({
      date: format(new Date(date), "MMM d"),
      revenue: val.revenue,
      orders: val.orders,
    }));

    // Top products
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    items.forEach((item) => {
      const name = item.product?.name || "Unknown";
      const existing = productMap.get(name) || { quantity: 0, revenue: 0 };
      existing.quantity += item.quantity || 0;
      existing.revenue += (item.unit_price || 0) * (item.quantity || 0);
      productMap.set(name, existing);
    });

    const topProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    setReportData({
      totalOrders,
      totalRevenue,
      averageOrderValue,
      itemsSold,
      dailyBreakdown,
      topProducts,
    });
    setLoading(false);
  }, [preset, dateFrom, dateTo, supabase]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (preset !== "custom") {
      const range = getDateRange(preset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [preset]);

  const summaryCards = [
    {
      label: "Total Orders",
      value: reportData.totalOrders.toLocaleString(),
      icon: ShoppingBag,
      color: "bg-crimson-100 text-crimson-700",
    },
    {
      label: "Revenue",
      value: formatCurrency(reportData.totalRevenue),
      icon: DollarSign,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Avg. Order Value",
      value: formatCurrency(reportData.averageOrderValue),
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Items Sold",
      value: reportData.itemsSold.toLocaleString(),
      icon: BarChart3,
      color: "bg-orange-100 text-orange-700",
    },
  ];

  const presets: { value: Preset; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Reports</h1>
          <p className="text-sm text-muted-foreground">Business analytics and insights</p>
        </div>
        {!loading && (
          <PDFDownloadLink
            document={<PdfReport dateFrom={dateFrom} dateTo={dateTo} data={reportData} />}
            fileName={`sfh-report-${dateFrom}-to-${dateTo}.pdf`}
          >
            {({ loading: pdfLoading }) => (
              <Button variant="outline" className="gap-2" disabled={pdfLoading}>
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download PDF
              </Button>
            )}
          </PDFDownloadLink>
        )}
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Period:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPreset(p.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    preset === p.value ? "bg-crimson-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-gray-200 text-sm"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>
            )}
          </div>
          {dateFrom && dateTo && (
            <p className="text-xs text-muted-foreground mt-2">
              {format(new Date(dateFrom), "MMM d, yyyy")} - {format(new Date(dateTo), "MMM d, yyyy")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
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

      {/* Revenue Chart */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-bold text-lg mb-4 font-display">Daily Revenue</h2>
          {loading ? (
            <div className="h-72 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${v}`} />
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
                    stroke="#b1454a"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products Table */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-bold text-lg mb-4 font-display">Top Selling Products</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : reportData.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Rank</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                      Product
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                      Qty Sold
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.topProducts.map((product, idx) => (
                    <tr key={product.name}>
                      <td className="py-3">
                        <span className="h-6 w-6 rounded-full bg-crimson-100 text-crimson-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 text-sm font-medium">{product.name}</td>
                      <td className="py-3 text-sm text-right text-gray-600">{product.quantity}</td>
                      <td className="py-3 text-sm text-right font-bold">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
