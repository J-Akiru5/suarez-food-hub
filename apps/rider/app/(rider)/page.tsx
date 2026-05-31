"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { watchPosition, getCurrentPosition } from "@/lib/geolocation";
import { MapPin, Phone, Navigation, CheckCircle, Package, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";

const DeliveryMap = dynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-200 rounded-xl flex items-center justify-center">
      <span className="text-gray-500">Loading map...</span>
    </div>
  ),
});

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  total_amount: number;
  payment_method: string;
  status: string;
  items: string;
  created_at: string;
  restaurant_address?: string;
  restaurant_lat?: number;
  restaurant_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
}

interface TodayStats {
  deliveries: number;
  earnings: number;
}

export default function RiderDashboard() {
  const supabase = createClient();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats>({ deliveries: 0, earnings: 0 });
  const [hasNewOrder, setHasNewOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [riderId, setRiderId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const fetchRiderData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setRiderId(user.id);

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("rider_id", user.id)
      .in("status", ["assigned", "picked_up"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (order) {
      setActiveOrder(order);
      setHasNewOrder(false);
    } else {
      setActiveOrder(null);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayOrders } = await supabase
      .from("orders")
      .select("id, total_amount, delivery_fee")
      .eq("rider_id", user.id)
      .eq("status", "delivered")
      .gte("completed_at", today.toISOString());

    if (todayOrders) {
      setTodayStats({
        deliveries: todayOrders.length,
        earnings: todayOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0),
      });
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRiderData();

    const channel = supabase
      .channel("rider-orders")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: riderId ? `rider_id=eq.${riderId}` : undefined,
        },
        (payload) => {
          const newOrder = payload.new as Order;
          if (newOrder.status === "assigned" || newOrder.status === "picked_up") {
            setActiveOrder(newOrder);
            setHasNewOrder(true);
          } else if (newOrder.status === "delivered") {
            setActiveOrder(null);
            fetchRiderData();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        () => {
          setHasNewOrder(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [fetchRiderData, riderId, supabase]);

  useEffect(() => {
    if (activeOrder && riderId) {
      const updateLocation = async () => {
        try {
          const pos = await getCurrentPosition();
          await fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rider_id: riderId,
              lat: pos.lat,
              lng: pos.lng,
              order_id: activeOrder.id,
            }),
          });
        } catch (err) {
          console.error("Location update failed:", err);
        }
      };

      updateLocation();
      watchIdRef.current = watchPosition(async (pos) => {
        try {
          await fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rider_id: riderId,
              lat: pos.lat,
              lng: pos.lng,
              order_id: activeOrder.id,
            }),
          });
        } catch (err) {
          console.error("Location update failed:", err);
        }
      });

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      };
    }
  }, [activeOrder, riderId]);

  const handleMarkDelivered = async () => {
    if (!activeOrder) return;
    setCompleting(true);

    try {
      await fetch("/api/orders/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: activeOrder.id }),
      });
      setActiveOrder(null);
      fetchRiderData();
    } catch (err) {
      console.error("Complete order failed:", err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {hasNewOrder && !activeOrder && (
        <div className="bg-brand-600 text-white p-4 rounded-xl pulse-notification flex items-center gap-3">
          <Package size={24} />
          <div>
            <p className="font-semibold">New Order Assignment!</p>
            <p className="text-sm text-brand-100">Tap to refresh</p>
          </div>
        </div>
      )}

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
          <p className="text-2xl font-bold text-brand-600">
            ₱{todayStats.earnings.toFixed(2)}
          </p>
        </div>
      </div>

      {activeOrder ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-brand-600 text-white px-4 py-2 flex items-center justify-between">
            <span className="font-semibold text-sm">Active Delivery</span>
            <span className="text-xs bg-brand-700 px-2 py-1 rounded-full">
              {activeOrder.status === "picked_up" ? "Picked Up" : "Assigned"}
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-semibold text-gray-800">{activeOrder.customer_name}</p>
            </div>

            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-brand-600 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700">{activeOrder.delivery_address}</p>
            </div>

            {activeOrder.items && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Items</p>
                <p className="text-sm text-gray-700">{activeOrder.items}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Payment</p>
                <p className="text-sm font-medium text-gray-800 capitalize">
                  {activeOrder.payment_method}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-sm font-bold text-brand-600">
                  ₱{activeOrder.total_amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {activeOrder.delivery_lat && activeOrder.delivery_lng && (
            <div className="px-4 pb-3">
              <DeliveryMap
                destinationLat={activeOrder.delivery_lat}
                destinationLng={activeOrder.delivery_lng}
                destinationLabel={activeOrder.delivery_address}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 p-4 pt-0">
            <a
              href={`tel:${activeOrder.customer_phone}`}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium text-sm transition"
            >
              <Phone size={16} />
              Call
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeOrder.delivery_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium text-sm transition"
            >
              <Navigation size={16} />
              Maps
            </a>
            <button
              onClick={handleMarkDelivered}
              disabled={completing}
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-medium text-sm transition disabled:opacity-50"
            >
              <CheckCircle size={16} />
              {completing ? "Done!" : "Delivered"}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Package size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No Active Delivery</p>
          <p className="text-sm text-gray-400 mt-1">
            Waiting for order assignment...
          </p>
        </div>
      )}
    </div>
  );
}
