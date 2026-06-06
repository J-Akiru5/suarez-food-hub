import type { TypedSupabaseClient } from "../client";

export interface ReportData {
  totalOrders: number;
  totalRevenue: number;
  totalItemsSold: number;
  dailyBreakdown: Map<string, { orders: number; revenue: number }>;
  topProducts: Map<string, { name: string; quantity: number; revenue: number }>;
  statusCounts: Map<string, number>;
}

export async function getReportData(
  supabase: TypedSupabaseClient,
  dateFrom: string,
  dateTo: string,
): Promise<ReportData> {
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, created_at")
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo)
    .neq("status", "cancelled");

  const orderIds = (orders || []).map((o) => o.id);

  let orderItems: any[] = [];
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from("order_items")
      .select("order_id, product_name, quantity, unit_price, total_price")
      .in("order_id", orderIds);
    orderItems = data || [];
  }

  const dailyBreakdown = new Map<string, { orders: number; revenue: number }>();
  const topProducts = new Map<string, { name: string; quantity: number; revenue: number }>();
  const statusCounts = new Map<string, number>();

  let totalRevenue = 0;
  let totalItemsSold = 0;

  for (const order of orders || []) {
    totalRevenue += Number(order.total);

    const day = order.created_at.slice(0, 10);
    const existing = dailyBreakdown.get(day) || { orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += Number(order.total);
    dailyBreakdown.set(day, existing);

    const sc = statusCounts.get(order.status) || 0;
    statusCounts.set(order.status, sc + 1);
  }

  for (const item of orderItems) {
    totalItemsSold += item.quantity;
    const existing = topProducts.get(item.product_name) || {
      name: item.product_name,
      quantity: 0,
      revenue: 0,
    };
    existing.quantity += item.quantity;
    existing.revenue += Number(item.total_price);
    topProducts.set(item.product_name, existing);
  }

  return {
    totalOrders: orders?.length || 0,
    totalRevenue,
    totalItemsSold,
    dailyBreakdown,
    topProducts,
    statusCounts,
  };
}
