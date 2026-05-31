"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, getOrderStatusConfig } from "@repo/utils";
import { Badge, Skeleton } from "@repo/ui";
import { ClipboardList, ChevronRight, Package } from "lucide-react";

interface OrderRecord {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  items?: { id: string }[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
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
        .select("*, items:order_items(id)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setOrders((data as OrderRecord[]) || []);
      setLoading(false);
    }
    fetchOrders();
  }, [supabase]);

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-gray-900"
          style={{ fontFamily: "var(--playfair-display)" }}
        >
          My Orders
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage your orders</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5">
              <div className="flex justify-between mb-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-20 w-20 rounded-full bg-[#b1454a]/10 flex items-center justify-center mb-4">
            <ClipboardList className="h-10 w-10 text-[#b1454a]/40" />
          </div>
          <h2
            className="font-bold text-xl mb-2 text-gray-900"
            style={{ fontFamily: "var(--playfair-display)" }}
          >
            No orders yet
          </h2>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            Your order history will appear here once you place your first order
          </p>
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          {orders.map((order) => {
            const status = getOrderStatusConfig(order.status);
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-gray-900">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Badge className={`${status.color} border-0 text-xs`}>
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {order.items?.length || 0} item(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-sm text-[#b1454a]"
                      style={{ fontFamily: "var(--playfair-display)" }}
                    >
                      {formatCurrency(order.total)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
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
