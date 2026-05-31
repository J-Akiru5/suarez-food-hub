"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, getOrderStatusConfig } from "@repo/utils";
import type { RiderLocation } from "@repo/types";
import { Badge, Skeleton } from "@repo/ui";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  ChefHat,
  Store,
} from "lucide-react";

const RiderMap = dynamic(() => import("./rider-map"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-32 flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-[#b1454a] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const statusSteps = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready_for_pickup", label: "Ready for Pickup", icon: Package },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

interface OrderRecord {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  delivery_instructions: string | null;
  rider_id: string | null;
  created_at: string;
}

interface OrderItemRecord {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [items, setItems] = useState<OrderItemRecord[]>([]);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchOrder() {
      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderData) {
        setOrder(orderData as OrderRecord);

        const { data: itemsData } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", orderId);

        setItems((itemsData as OrderItemRecord[]) || []);

        if (orderData.rider_id) {
          const { data: locData } = await supabase
            .from("rider_locations")
            .select("*")
            .eq("rider_id", orderData.rider_id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

          setRiderLocation(locData as RiderLocation);
        }
      }
      setLoading(false);
    }
    fetchOrder();
  }, [orderId, supabase]);

  // Realtime subscription for rider location
  useEffect(() => {
    if (!order?.rider_id) return;

    const channel = supabase
      .channel(`rider-location-${order.rider_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rider_locations",
          filter: `rider_id=eq.${order.rider_id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setRiderLocation(payload.new as RiderLocation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.rider_id, supabase]);

  // Realtime for order status
  useEffect(() => {
    if (!order) return;

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder(payload.new as OrderRecord);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, supabase]);

  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    return statusSteps.findIndex((s) => s.key === order.status);
  }, [order?.status]);

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full rounded-32" />
        <Skeleton className="h-64 w-full rounded-32" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  const status = getOrderStatusConfig(order.status);

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-xs text-gray-400">
            {formatDate(order.created_at)}
          </p>
        </div>
        <Badge className={`${status.color} border-0`}>
          {status.label}
        </Badge>
      </div>

      {/* Rider Map - show when out for delivery */}
      {order.status === "out_for_delivery" && riderLocation && (
        <div className="rounded-32 overflow-hidden shadow-lg">
          <RiderMap
            latitude={riderLocation.latitude}
            longitude={riderLocation.longitude}
          />
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5">
        <h2
          className="font-bold text-base mb-4 text-gray-900"
          style={{ fontFamily: "var(--playfair-display)" }}
        >
          Order Status
        </h2>
        <div className="space-y-0">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isCompleted
                        ? "bg-[#b1454a] text-white"
                        : "bg-gray-100 text-gray-400"
                    } ${isCurrent ? "ring-4 ring-[#b1454a]/20" : ""}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`w-0.5 h-8 transition-colors duration-300 ${
                        index < currentStepIndex
                          ? "bg-[#b1454a]"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
                <div className="pb-6 pt-2">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5">
        <h2
          className="font-bold text-base mb-4 text-gray-900"
          style={{ fontFamily: "var(--playfair-display)" }}
        >
          Order Items
        </h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 pb-3 border-b border-dashed border-gray-200 last:border-0 last:pb-0"
            >
              <div className="h-14 w-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                <div className="flex items-center justify-center h-full">
                  <Store className="h-6 w-6 text-gray-300" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                {item.variant_name && (
                  <p className="text-xs text-gray-400">{item.variant_name}</p>
                )}
                <p className="text-xs text-gray-400">
                  Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                </p>
              </div>
              <p
                className="font-bold text-sm text-[#b1454a]"
                style={{ fontFamily: "monospace" }}
              >
                {formatCurrency(item.total_price)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white/65 backdrop-blur-xl border border-white/40 rounded-32 p-5 space-y-4">
        <h2
          className="font-bold text-base text-gray-900"
          style={{ fontFamily: "var(--playfair-display)" }}
        >
          Order Details
        </h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Delivery Fee</span>
            <span className="text-gray-900">{formatCurrency(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-dashed border-gray-200 pt-2">
            <span className="text-gray-900">Total</span>
            <span className="text-[#b1454a]">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-200 pt-4 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-[#b1454a] mt-0.5 shrink-0" />
            <p className="text-gray-500">{order.delivery_address}</p>
          </div>
          {order.delivery_instructions && (
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-gray-500">{order.delivery_instructions}</p>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-200 pt-4 text-sm">
          <p className="text-gray-500">
            Payment:{" "}
            <span className="font-medium text-gray-900 capitalize">
              {order.payment_method === "cod" || order.payment_method === "cash_on_delivery"
                ? "Cash on Delivery"
                : "GCash"}
            </span>
          </p>
          <p className="text-gray-500 mt-1">
            Payment Status:{" "}
            <span
              className={`font-medium capitalize ${
                order.payment_status === "paid"
                  ? "text-green-600"
                  : order.payment_status === "failed"
                  ? "text-red-600"
                  : "text-yellow-600"
              }`}
            >
              {order.payment_status}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
