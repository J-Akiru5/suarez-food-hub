"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getTodayEarnings } from "@repo/data-access/data/earnings";
import { getActiveOrderForRider, getPendingOrdersForRider } from "@repo/data-access/data/orders";
import { eachDayOfInterval, endOfWeek, format, startOfWeek } from "date-fns";
import {
  BarChart3,
  CheckCircle,
  ChevronRight,
  Clock,
  Gauge,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { getCurrentPosition, watchPosition } from "@/lib/geolocation";

// Restaurant origin — fetched from business_config on mount

const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-gray-400 text-sm">Loading map...</span>
    </div>
  ),
});

interface Order {
  id: string;
  user_id: string;
  customer?: { first_name: string; last_name: string; full_name: string; phone: string } | null;
  delivery_address: string;
  delivery_contact: string;
  total: number;
  delivery_fee: number;
  payment_method: string;
  payment_status: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  status: string;
  created_at: string;
  delivered_at?: string | null;
}

interface TodayStats {
  deliveries: number;
  earnings: number;
}


export default function RiderDashboard() {
  const supabase = createBrowserTypedClient();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats>({ deliveries: 0, earnings: 0 });
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [avgDeliveryTime, setAvgDeliveryTime] = useState(0);
  const [onTimeRate, setOnTimeRate] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState<{ day: string; amount: number }[]>([]);
  const [restaurantOrigin, setRestaurantOrigin] = useState("10.9501875,122.5065625");
  const riderIdRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  const fetchRiderData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    riderIdRef.current = user.id;
    setRiderId(user.id);

    const order = await getActiveOrderForRider(supabase, user.id);

    if (order) {
      setActiveOrder(order as any);
      setHasNewOrder(false);
      const pending = await getPendingOrdersForRider(supabase, user.id);
      setPendingOrders(pending as Order[]);
    } else {
      setActiveOrder(null);
      const pending = await getPendingOrdersForRider(supabase, user.id);
      setPendingOrders(pending as Order[]);
    }

    // Today's earnings
    const todayEarnings = await getTodayEarnings(supabase, user.id);
    if (todayEarnings) {
      setTodayStats({
        deliveries: todayEarnings.length,
        earnings: todayEarnings.reduce((sum, e) => sum + (e.amount || 0), 0),
      });
    }

    // Weekly earnings for sparkline
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const { data: weekEarningsRaw } = await supabase
      .from("rider_earnings")
      .select("amount, earned_at")
      .eq("rider_id", user.id)
      .gte("earned_at", weekStart.toISOString());

    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(now, { weekStartsOn: 1 }) });
    const dailyTotals = weekDays.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const amount = (weekEarningsRaw || [])
        .filter((e: any) => format(new Date(e.earned_at), "yyyy-MM-dd") === dayStr)
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      return { day: format(day, "EEE"), amount };
    });
    setWeeklyEarnings(dailyTotals);

    // Calculate performance metrics
    // Average delivery time from completed orders
    const { data: completedOrders } = await supabase
      .from("orders")
      .select("created_at, delivered_at, confirmed_at, status")
      .eq("rider_id", user.id)
      .eq("status", "delivered");

    if (completedOrders && completedOrders.length > 0) {
      const times = completedOrders
        .filter((o: any) => o.delivered_at && o.confirmed_at)
        .map((o: any) =>
          (new Date(o.delivered_at).getTime() - new Date(o.confirmed_at).getTime()) / 60000,
        );
      const avgTime =
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      setAvgDeliveryTime(Math.round(avgTime));

      // On-time rate: delivered within 45 min of confirmation
      const onTime = times.filter((t) => t <= 45).length;
      setOnTimeRate(Math.round((onTime / times.length) * 100));
    }

    setLoading(false);
  }, [supabase]);

  // Fetch restaurant location from DB
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_config")
        .select("base_lat, base_lng")
        .limit(1)
        .maybeSingle();
      if (data?.base_lat && data?.base_lng) {
        setRestaurantOrigin(`${data.base_lat},${data.base_lng}`);
      }
    })();
  }, [supabase]);

  // Pull-to-refresh gesture
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!isPulling.current) return;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (dy > 100) {
        setRefreshing(true);
        await fetchRiderData();
        setRefreshing(false);
      }
      isPulling.current = false;
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [fetchRiderData]);

  useEffect(() => {
    fetchRiderData();

    // Listen to all order changes — filter on client side via riderIdRef
    const channel = supabase
      .channel("rider-orders")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const newOrder = payload.new as any;
          const currentRiderId = riderIdRef.current;
          if (newOrder.rider_id !== currentRiderId) return;

          if (
            newOrder.status === "confirmed" ||
            newOrder.status === "preparing" ||
            newOrder.status === "ready_for_pickup" ||
            newOrder.status === "claimed_by_rider" ||
            newOrder.status === "out_for_delivery" ||
            newOrder.status === "near_customer"
          ) {
            fetchRiderData();
            // Play sound on new assignment
            if (payload.old && (payload.old as any).rider_id !== currentRiderId && newOrder.rider_id === currentRiderId) {
              playNotification();
            }
          } else if (newOrder.status === "delivered") {
            setActiveOrder(null);
            setPendingOrders([]);
            fetchRiderData();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const newOrder = payload.new as any;
          if (newOrder.rider_id === riderIdRef.current) {
            setHasNewOrder(true);
            fetchRiderData();
          }
        },
      )
      .subscribe();

    // Periodic polling fallback every 30 seconds
    const pollInterval = setInterval(() => {
      if (riderIdRef.current) {
        fetchRiderData();
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [fetchRiderData, supabase]);
  // Note: riderId intentionally NOT in deps — we use riderIdRef to avoid re-creating the channel

  useEffect(() => {
    if (!activeOrder || !riderId) return;
    if (!navigator.geolocation) return; // Geolocation not supported, skip

    let cancelled = false;

    const sendLocation = async (lat: number, lng: number) => {
      try {
        const res = await fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rider_id: riderId,
            lat,
            lng,
            order_id: activeOrder.id,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.warn("Location API error:", data.error || res.statusText);
        }
      } catch {
        // Network error sending location - non-critical, silently ignore
      }
    };

    // Try getting initial position
    getCurrentPosition()
      .then((pos) => {
        if (cancelled) return;
        sendLocation(pos.lat, pos.lng);

        // Only set up continuous watch if initial position succeeded
        watchIdRef.current = watchPosition(async (pos) => {
          if (!cancelled) await sendLocation(pos.lat, pos.lng);
        });
      })
      .catch(() => {
        // Geolocation unavailable (desktop, denied permission, etc.)
        // Location tracking is non-critical, silently skip
      });

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [activeOrder, riderId]);

  const handleStatusAction = async (orderId: string, nextStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        Swal.fire({ icon: "error", title: "Error", text: data.error || "Failed to update." });
      } else {
        Swal.fire({
          icon: "success",
          title: nextStatus === "delivered" ? "Delivered!" : "Status Updated",
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
        fetchRiderData();
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
    setUpdating(false);
  };

  const playNotification = () => {
    try {
      // Respect user preferences from localStorage (set in Profile page)
      const soundEnabled = localStorage.getItem("rider_sound_enabled") !== "false";
      const vibrationEnabled = localStorage.getItem("rider_vibration_enabled") !== "false";

      if (soundEnabled) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }

      if (vibrationEnabled && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch {}
  };

  const maxWeeklyAmt = Math.max(...weeklyEarnings.map((d) => d.amount), 1);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-100">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-100">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" ref={mainRef}>
      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div className="flex items-center justify-center gap-2 py-2 text-brand-600 text-sm animate-pulse">
          <RefreshCw size={16} className="animate-spin" />
          Refreshing...
        </div>
      )}

      {hasNewOrder && !activeOrder && (
        <div className="bg-brand-600 text-white p-4 rounded-xl pulse-notification flex items-center gap-3"
          onClick={() => fetchRiderData()}
        >
          <Package size={24} />
          <div className="flex-1">
            <p className="font-semibold">New Order Assignment!</p>
            <p className="text-sm text-brand-100">Tap to refresh</p>
          </div>
          <RefreshCw size={20} />
        </div>
      )}

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-100">
          <div className="flex items-center gap-2 text-brand-600 mb-1">
            <Package size={16} />
            <span className="text-xs font-medium">Today&apos;s Deliveries</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{todayStats.deliveries}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-brand-100">
          <div className="flex items-center gap-2 text-brand-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-medium">Today&apos;s Earnings</span>
          </div>
          <p className="text-2xl font-bold text-brand-600">₱{todayStats.earnings.toFixed(2)}</p>
        </div>
      </div>



      {/* Weekly Earnings Trend — real data */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
          <BarChart3 size={14} className="text-brand-500" />
          Weekly Earnings Trend
        </h3>
        <div className="flex items-end justify-between gap-1.5 h-32 pt-4">
          {weeklyEarnings.length === 0 || weeklyEarnings.every((d) => d.amount === 0) ? (
            <div className="w-full flex flex-col items-center justify-center h-full gap-2">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="opacity-30">
                <path d="M3.5 18.5L9.5 12.5L13.5 16.5L22 6.5L20.59 5.09L13.5 13.5L9.5 9.5L2 17L3.5 18.5Z" fill="#94a3b8"/>
                <path d="M21 19H3V21H21V19Z" fill="#94a3b8"/>
              </svg>
              <p className="text-sm font-semibold text-gray-400">No Earnings Yet</p>
              <p className="text-[11px] text-gray-300">Complete deliveries to see your weekly trend</p>
            </div>
          ) : (
            weeklyEarnings.map((day, i) => {
              const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
              const barHeight = day.amount > 0 ? Math.max((day.amount / maxWeeklyAmt) * 100, 10) : 3;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 relative h-full">
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {day.amount > 0 ? `₱${day.amount}` : ""}
                  </span>
                  <div
                    className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 ${
                      day.amount > 0
                        ? "bg-gradient-to-t from-brand-500 to-brand-400"
                        : "bg-gray-100"
                    }`}
                    style={{
                      height: `${barHeight}%`,
                      opacity: i <= todayIndex ? 1 : 0.3,
                    }}
                  />
                  <span className="text-[10px] text-gray-500 font-medium">{day.day}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {activeOrder && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-brand-600 text-white px-4 py-2 flex items-center justify-between">
            <span className="font-semibold text-sm">Active Delivery</span>
            <span className="text-xs bg-brand-700 px-2 py-1 rounded-full capitalize">
              {activeOrder.status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-semibold text-gray-800">
                {(() => {
                  const c = (activeOrder as any).customer;
                  if (!c) return "Customer";
                  return `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.full_name || "Customer";
                })()}
              </p>
            </div>

            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-brand-600 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700">{activeOrder.delivery_address}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Payment</p>
                <p className="text-sm font-medium text-gray-800 capitalize">
                  {activeOrder.payment_method?.replace(/_/g, " ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-sm font-bold text-brand-600">₱{Number(activeOrder.total).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {activeOrder.delivery_lat && activeOrder.delivery_lng && (
            <div className="px-4 pb-3">
              <DeliveryMap
                destinationLat={Number(activeOrder.delivery_lat)}
                destinationLng={Number(activeOrder.delivery_lng)}
                destinationLabel={activeOrder.delivery_address}
              />
            </div>
          )}

          {/* Status Actions */}
          {(activeOrder.status === "ready_for_pickup" ||
            activeOrder.status === "claimed_by_rider" ||
            activeOrder.status === "out_for_delivery" ||
            activeOrder.status === "near_customer") && (
            <div className="px-4 pb-2">
              {activeOrder.status === "ready_for_pickup" && (
                <button
                  onClick={() => handleStatusAction(activeOrder.id, "claimed_by_rider")}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  <Package size={18} />
                  {updating ? "Updating..." : "Accept & Pick Up Order"}
                </button>
              )}
              {activeOrder.status === "claimed_by_rider" && (
                <button
                  onClick={() => handleStatusAction(activeOrder.id, "out_for_delivery")}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  <Navigation size={18} />
                  {updating ? "Updating..." : "Start Delivery"}
                </button>
              )}
              {activeOrder.status === "out_for_delivery" && (
                <button
                  onClick={() => handleStatusAction(activeOrder.id, "near_customer")}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  <MapPin size={18} />
                  {updating ? "Updating..." : "I'm Near Customer"}
                </button>
              )}
              {activeOrder.status === "near_customer" && (
                <button
                  onClick={() => handleStatusAction(activeOrder.id, "delivered")}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  {updating ? "Updating..." : "Mark Delivered"}
                </button>
              )}
            </div>
          )}

          {/* Call, Navigate, Details buttons */}
          <div className="grid grid-cols-3 gap-2 p-4 pt-2">
            <a
              href={`tel:${(activeOrder as any).customer?.phone || activeOrder.delivery_contact}`}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium text-sm transition"
            >
              <Phone size={16} />
              Call
            </a>
            <a
              href={
                activeOrder.delivery_lat && activeOrder.delivery_lng
                  ? `https://www.google.com/maps/dir/?api=1&origin=${restaurantOrigin}&destination=${activeOrder.delivery_lat},${activeOrder.delivery_lng}`
                  : `https://www.google.com/maps/dir/?api=1&origin=${restaurantOrigin}&destination=${encodeURIComponent(activeOrder.delivery_address)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium text-sm transition"
            >
              <Navigation size={16} />
              Maps
            </a>
            <Link
              href={`/orders/${activeOrder.id}`}
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-medium text-sm transition"
            >
              <ChevronRight size={16} />
              Details
            </Link>
          </div>
        </div>
      )}

      {/* Pending Orders (assigned but not yet out for delivery) */}
      {pendingOrders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5 px-1">
            <Clock size={14} className="text-amber-500" />
            Pending Pickup ({pendingOrders.length})
          </h3>
          {pendingOrders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white rounded-xl shadow-sm border border-amber-100 p-3 hover:shadow-md hover:border-amber-300 transition active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {(() => {
                      const c = (order as any).customer;
                      if (!c) return "Customer";
                      return `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Customer";
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{order.delivery_address}</p>
                </div>
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full capitalize whitespace-nowrap">
                  {order.status.replace(/_/g, " ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No assignments state */}
      {!activeOrder && pendingOrders.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Package size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No Active Delivery</p>
          <p className="text-sm text-gray-400 mt-1">Waiting for order assignment...</p>
        </div>
      )}
    </div>
  );
}
