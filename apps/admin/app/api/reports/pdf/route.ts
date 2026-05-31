import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@repo/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { success: false, error: "from and to date parameters are required" },
      { status: 400 }
    );
  }

  const from = `${dateFrom}T00:00:00`;
  const to = `${dateTo}T23:59:59`;

  // Fetch orders
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .gte("created_at", from)
    .lte("created_at", to)
    .neq("status", "cancelled");

  // Fetch order items
  const { data: items } = await supabase
    .from("order_items")
    .select("quantity, unit_price, product:products!order_items_product_id_fkey(name)")
    .gte("created_at", from)
    .lte("created_at", to);

  const ordersList = orders || [];
  const itemsList = (items || []) as any[];

  const totalOrders = ordersList.length;
  const totalRevenue = ordersList.reduce((sum, o) => sum + (o.total || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const itemsSold = itemsList.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Daily breakdown
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo);
  const daysDiff = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  for (let i = 0; i < daysDiff; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, { revenue: 0, orders: 0 });
  }

  ordersList.forEach((o) => {
    const key = o.created_at.split("T")[0];
    const existing = dailyMap.get(key);
    if (existing) {
      existing.revenue += o.total || 0;
      existing.orders += 1;
    }
  });

  const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, val]) => ({
    date,
    revenue: val.revenue,
    orders: val.orders,
  }));

  // Top products
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  itemsList.forEach((item) => {
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

  // Return JSON data - the PDF is generated client-side via @react-pdf/renderer
  return NextResponse.json({
    success: true,
    data: {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      itemsSold,
      dailyBreakdown,
      topProducts,
      dateFrom,
      dateTo,
    },
  });
}
