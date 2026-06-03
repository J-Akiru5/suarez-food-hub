"use client";

import { format } from "date-fns";
import { Package, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Delivery {
  id: string;
  customer?: { full_name: string; first_name?: string; last_name?: string } | null;
  delivery_address: string;
  total: number;
  delivery_fee: number;
  status: string;
  delivered_at: string;
  created_at: string;
}

export default function DeliveriesPage() {
  const supabase = createClient();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, earnings: 0 });

  useEffect(() => {
    const fetchDeliveries = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("orders")
        .select("*, customer:profiles!orders_user_id_fkey(first_name, last_name, full_name)")
        .eq("rider_id", user.id)
        .eq("status", "delivered")
        .order("delivered_at", { ascending: false });

      if (data) {
        setDeliveries(data as Delivery[]);
        setStats({
          total: data.length,
          earnings: data.reduce((sum: number, d: any) => sum + (d.delivery_fee || 0), 0),
        });
      }
      setLoading(false);
    };

    fetchDeliveries();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-100">
          <div className="flex items-center gap-2 text-brand-600 mb-1">
            <Package size={16} />
            <span className="text-xs font-medium">Total Deliveries</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-100">
          <div className="flex items-center gap-2 text-brand-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">Total Earnings</span>
          </div>
          <p className="text-2xl font-bold text-brand-600">₱{stats.earnings.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {deliveries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <Package size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No deliveries yet</p>
            <p className="text-sm text-gray-400 mt-1">Completed deliveries will appear here</p>
          </div>
        ) : (
          deliveries.map((delivery) => (
            <div key={delivery.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-800">
                    {(() => {
                      const c = delivery.customer;
                      if (!c) return "Customer";
                      if (c.first_name || c.last_name) {
                        return `${c.first_name || ""} ${c.last_name || ""}`.trim();
                      }
                      return c.full_name || "Customer";
                    })()}
                  </p>
                  <p className="text-sm text-gray-500">{delivery.delivery_address}</p>
                </div>
                <span className="text-sm font-bold text-brand-600">
                  ₱{Number(delivery.delivery_fee || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {delivery.delivered_at
                    ? format(new Date(delivery.delivered_at), "MMM d, yyyy h:mm a")
                    : format(new Date(delivery.created_at), "MMM d, yyyy h:mm a")}
                </span>
                <span className="text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full font-medium">Delivered</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
