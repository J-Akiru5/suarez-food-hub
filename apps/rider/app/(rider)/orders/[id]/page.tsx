"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getOrderById } from "@repo/data-access/data/orders";
import type { Order, Profile } from "@repo/types";
import { formatCurrency } from "@repo/utils";
import {
  ArrowLeft,
  CheckCircle,
  ChefHat,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  ShoppingBag,
  User,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

interface OrderDetail extends Order {
  profile?: Profile | null;
  items?: any[];
}

const STATUS_FLOW = [
  { key: "confirmed", label: "Confirmed", icon: CheckCircle, color: "#3b82f6" },
  { key: "preparing", label: "Preparing", icon: ChefHat, color: "#8b5cf6" },
  { key: "ready_for_pickup", label: "Ready for Pickup", icon: Package, color: "#f59e0b" },
  { key: "claimed_by_rider", label: "Picked Up", icon: Package, color: "#06b6d4" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Navigation, color: "#f97316" },
  { key: "near_customer", label: "Near Customer", icon: MapPin, color: "#10b981" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, color: "#22c55e" },
];

// Rider actions mapped to status
// Suarez Siomai Food Hub origin (Janiuay, Iloilo)
const JANIUAY_ORIGIN = "10.9501875,122.5065625";

const RIDER_ACTIONS: Record<string, { label: string; nextStatus: string; icon: any; color: string }[]> = {
  ready_for_pickup: [{ label: "Accept & Pick Up", nextStatus: "claimed_by_rider", icon: Package, color: "#06b6d4" }],
  claimed_by_rider: [{ label: "Start Delivery", nextStatus: "out_for_delivery", icon: Navigation, color: "#f97316" }],
  out_for_delivery: [{ label: "I'm Near Customer", nextStatus: "near_customer", icon: MapPin, color: "#10b981" }],
  near_customer: [{ label: "Mark Delivered", nextStatus: "delivered", icon: CheckCircle, color: "#22c55e" }],
};

export default function RiderOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createBrowserTypedClient();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>("connecting");

  const orderId = params.id as string;

  const fetchOrder = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const data = await getOrderById(supabase, orderId);
    if (!data || data.rider_id !== user.id) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    setOrder(data as OrderDetail);
    setLoading(false);
  }, [supabase, orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Realtime auto-refresh when order status changes
  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          fetchOrder();
        },
      )
      .subscribe((status) => {
        setRealtimeStatus(status === "SUBSCRIBED" ? "connected" : "disconnected");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrder, orderId, supabase]);

  async function handleStatusAction(nextStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: nextStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        Swal.fire({ icon: "error", title: "Error", text: data.error || "Failed to update status." });
      } else {
        Swal.fire({
          icon: "success",
          title: nextStatus === "delivered" ? "Delivered!" : "Status Updated",
          text:
            nextStatus === "delivered"
              ? "Order has been marked as delivered."
              : `Order status changed to ${nextStatus.replace(/_/g, " ")}.`,
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
        fetchOrder();
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Something went wrong." });
    }
    setUpdating(false);
  }

  const timelineIndex = STATUS_FLOW.findIndex((s) => s.key === order?.status);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🔒</span>
        </div>
        <p className="text-gray-500 font-medium">Access Denied</p>
        <p className="text-sm text-gray-400 mt-1">This order is not assigned to you.</p>
        <button onClick={() => router.back()} className="mt-4 text-brand-600 font-medium">
          Go Back
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Order not found</p>
        <button onClick={() => router.back()} className="mt-4 text-brand-600 font-medium">
          Go Back
        </button>
      </div>
    );
  }

  const actions = RIDER_ACTIONS[order.status];

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Order Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Order #{orderId.slice(0, 8).toUpperCase()}</h1>
          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-all ${
              realtimeStatus === "connected" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                realtimeStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            {realtimeStatus === "connected" ? "Live" : "..."}
          </span>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-brand-100 text-brand-700 capitalize">
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Status Timeline */}
      {order.status !== "cancelled" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-sm text-gray-700 mb-3">Order Timeline</h2>
          <div className="space-y-0">
            {STATUS_FLOW.map((step, idx) => {
              const isCompleted = idx <= timelineIndex;
              const isCurrent = idx === timelineIndex;
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isCompleted ? "text-white" : "bg-gray-100 text-gray-400"
                      }`}
                      style={{ background: isCompleted ? step.color : undefined }}
                    >
                      <StepIcon size={14} />
                    </div>
                    {idx < STATUS_FLOW.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ${isCompleted ? "opacity-100" : "opacity-30"}`}
                        style={{ background: isCompleted ? step.color : "#e5e7eb" }}
                      />
                    )}
                  </div>
                  <div className={`pb-6 ${idx === STATUS_FLOW.length - 1 ? "pb-0" : ""}`}>
                    <p
                      className={`text-sm font-medium ${isCurrent ? "font-bold" : ""}`}
                      style={{ color: isCurrent ? step.color : isCompleted ? "#374151" : "#9ca3af" }}
                    >
                      {step.label}
                    </p>
                    {isCurrent && order.status !== "delivered" && (
                      <p className="text-xs text-gray-400 mt-0.5">Current</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {order.status === "cancelled" && (
        <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
          <XCircle size={20} className="text-red-500 shrink-0" />
          <p className="text-sm font-medium text-red-700">This order has been cancelled</p>
        </div>
      )}

      {/* Status Action Area — always visible with contextual info */}
      {(order.status === "confirmed" || order.status === "pending") && (
        <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 border border-blue-100">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
            <Clock size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-blue-800">Waiting for Restaurant</p>
            <p className="text-xs text-blue-600 mt-1">
              The order has been confirmed. The restaurant will start preparing shortly. You&apos;ll be notified when
              it&apos;s ready for pickup.
            </p>
          </div>
        </div>
      )}

      {order.status === "preparing" && (
        <div className="bg-purple-50 rounded-xl p-4 flex items-start gap-3 border border-purple-100">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
            <ChefHat size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-purple-800">Being Prepared</p>
            <p className="text-xs text-purple-600 mt-1">
              The restaurant is cooking your customer&apos;s order. Head to Suarez Siomai Food Hub so you&apos;re ready
              when it&apos;s done.
            </p>
          </div>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.nextStatus}
              onClick={() => handleStatusAction(action.nextStatus)}
              disabled={updating}
              className="w-full flex items-center justify-center gap-2 text-white py-3.5 rounded-xl font-semibold text-sm transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
              style={{ background: action.color }}
            >
              <action.icon size={18} />
              {updating ? "Updating..." : action.label}
            </button>
          ))}
        </div>
      )}

      {order.status === "delivered" && (
        <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3 border border-green-100">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-green-800">Order Delivered</p>
            <p className="text-xs text-green-600 mt-1">
              This order has been successfully delivered. ₱{Number(order.rider_earnings || 40).toFixed(2)} has been
              added to your earnings.
            </p>
          </div>
        </div>
      )}

      {/* Customer Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
          <User size={16} className="text-brand-500" />
          Customer Details
        </h2>
        <div>
          <p className="text-sm font-medium text-gray-800">
            {order.profile
              ? `${order.profile.first_name || ""} ${order.profile.last_name || ""}`.trim() || "Customer"
              : "Customer"}
          </p>
          <p className="text-xs text-gray-500">{order.delivery_contact}</p>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-600">{order.delivery_address}</p>
        </div>
        {order.delivery_notes && (
          <div className="bg-yellow-50 rounded-lg p-2 text-xs text-yellow-800">Note: {order.delivery_notes}</div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={`tel:${order.delivery_contact}`}
            className="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium transition"
          >
            <Phone size={15} />
            Call
          </a>
          <a
            href={
              order.delivery_lat && order.delivery_lng
                ? `https://www.google.com/maps/dir/?api=1&origin=${JANIUAY_ORIGIN}&destination=${order.delivery_lat},${order.delivery_lng}`
                : `https://www.google.com/maps/dir/?api=1&origin=${JANIUAY_ORIGIN}&destination=${encodeURIComponent(order.delivery_address)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium transition"
          >
            <Navigation size={15} />
            Navigate
          </a>
        </div>
      </div>

      {/* Restaurant / Pickup Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2">
        <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
          <ShoppingBag size={16} className="text-brand-500" />
          Pickup & Payment
        </h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Payment</span>
          <span className="font-medium capitalize">{order.payment_method.replace(/_/g, " ")}</span>
        </div>
        {order.payment_method !== "cod" && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Payment Status</span>
            <span
              className={`font-medium capitalize ${order.payment_status === "verified" ? "text-green-600" : "text-amber-600"}`}
            >
              {order.payment_status}
            </span>
          </div>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=Suarez+Siomai+Food+Hub`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium transition mt-2"
        >
          <Navigation size={15} />
          Navigate to Restaurant
        </a>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-1.5">
          <ShoppingBag size={16} className="text-brand-500" />
          Order Items
        </h2>
        <div className="space-y-2">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{item.product?.name || item.product_name || "Item"}</p>
                {(item as any).variant_name && <p className="text-xs text-gray-400">{(item as any).variant_name}</p>}
                <p className="text-xs text-gray-400">x{item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-brand-600">
                ₱{Number(item.total_price || item.unit_price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>₱{Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery Fee</span>
            <span>₱{Number(order.delivery_fee).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1">
            <span>Total</span>
            <span className="text-brand-600">₱{Number(order.total).toFixed(2)}</span>
          </div>
        </div>

        {order.rider_earnings && Number(order.rider_earnings) > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Your Earnings</span>
            <span className="font-semibold text-green-600">₱{Number(order.rider_earnings).toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
