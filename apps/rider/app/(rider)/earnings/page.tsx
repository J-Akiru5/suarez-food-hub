"use client";

import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { BarChart3, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface EarningsData {
  today: number;
  week: number;
  month: number;
  total: number;
  dailyEarnings: { date: string; amount: number }[];
  recentDeliveries: { id: string; date: string; amount: number; address: string }[];
}

export default function EarningsPage() {
  const supabase = createClient();
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    dailyEarnings: [],
    recentDeliveries: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);

      const { data: monthEarnings } = await supabase
        .from("rider_earnings")
        .select("id, amount, created_at, order_id, status")
        .eq("rider_id", user.id)
        .gte("created_at", monthStart.toISOString())
        .order("created_at", { ascending: false });

      const { data: allEarnings } = await supabase.from("rider_earnings").select("amount").eq("rider_id", user.id);

      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id, delivery_address, delivered_at, delivery_fee")
        .eq("rider_id", user.id)
        .eq("status", "delivered")
        .order("delivered_at", { ascending: false })
        .limit(10);

      if (monthEarnings) {
        const todayAmt = monthEarnings
          .filter((e) => new Date(e.created_at) >= todayStart)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        const weekAmt = monthEarnings
          .filter((e) => new Date(e.created_at) >= weekStart)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        const monthAmt = monthEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalAmt = allEarnings ? allEarnings.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;

        const weekDays = eachDayOfInterval({
          start: weekStart,
          end: endOfWeek(now, { weekStartsOn: 1 }),
        });

        const dailyEarnings = weekDays.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayAmt = monthEarnings
            .filter((e) => format(new Date(e.created_at), "yyyy-MM-dd") === dayStr)
            .reduce((sum, e) => sum + (e.amount || 0), 0);
          return { date: format(day, "EEE"), amount: dayAmt };
        });

        const recentDeliveries = (recentOrders || []).map((o) => ({
          id: o.id,
          date: o.delivered_at ? format(new Date(o.delivered_at), "MMM d") : "—",
          amount: o.delivery_fee || 0,
          address: o.delivery_address,
        }));

        setEarnings({
          today: todayAmt,
          week: weekAmt,
          month: monthAmt,
          total: totalAmt,
          dailyEarnings,
          recentDeliveries,
        });
      }
      setLoading(false);
    };

    fetchEarnings();
  }, [supabase]);

  const maxDaily = Math.max(...earnings.dailyEarnings.map((d) => d.amount), 1);

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
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Calendar size={16} />
            <span className="text-xs font-medium">Today</span>
          </div>
          <p className="text-xl font-bold text-brand-600">₱{earnings.today.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">This Week</span>
          </div>
          <p className="text-xl font-bold text-brand-600">₱{earnings.week.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <DollarSign size={16} />
            <span className="text-xs font-medium">This Month</span>
          </div>
          <p className="text-xl font-bold text-brand-600">₱{earnings.month.toFixed(2)}</p>
        </div>
        <div className="bg-brand-50 rounded-xl p-4 shadow-sm border border-brand-100">
          <div className="flex items-center gap-2 text-brand-600 mb-1">
            <BarChart3 size={16} />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-xl font-bold text-brand-700">₱{earnings.total.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">This Week</h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {earnings.dailyEarnings.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{day.amount > 0 ? `₱${day.amount}` : ""}</span>
              <div
                className="w-full bg-brand-600 rounded-t-md transition-all"
                style={{
                  height: `${day.amount > 0 ? Math.max((day.amount / maxDaily) * 100, 8) : 4}%`,
                  opacity: day.amount > 0 ? 1 : 0.3,
                }}
              />
              <span className="text-xs text-gray-500 font-medium">{day.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Recent Deliveries</h3>
        {earnings.recentDeliveries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No earnings yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {earnings.recentDeliveries.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate">{d.address}</p>
                  <p className="text-xs text-gray-400">{d.date}</p>
                </div>
                <span className="text-sm font-semibold text-brand-600 ml-3">₱{d.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
