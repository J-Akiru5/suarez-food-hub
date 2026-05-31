"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, getOrderStatusConfig } from "@repo/utils";
import type { Order } from "@repo/types";
import { Badge } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  ClipboardList,
  ChevronRight,
  Package,
} from "lucide-react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchOrders() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();
  }, [supabase]);

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-bold mb-4">My Orders</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between mb-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ClipboardList className="h-8 w-8 text-gray-300" />
          </div>
          <h2 className="font-bold text-lg mb-1">No orders yet</h2>
          <p className="text-sm text-muted-foreground">
            Your order history will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {orders.map((order) => {
            const status = getOrderStatusConfig(order.status);
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono text-sm font-semibold">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Badge className={`${status.color} border-0 text-xs`}>
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {order.items?.length || 0} item(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      {formatCurrency(order.total)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
