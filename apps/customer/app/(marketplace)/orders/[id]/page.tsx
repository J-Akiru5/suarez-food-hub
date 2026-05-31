"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, getOrderStatusConfig } from "@repo/utils";
import type { Order, OrderItem, RiderLocation } from "@repo/types";
import { Button } from "@repo/ui";
import { Badge } from "@repo/ui";
import { Skeleton } from "@repo/ui";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  ChefHat,
  XCircle,
  Store,
} from "lucide-react";

const RiderMap = dynamic(() => import("./rider-map"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
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
        setOrder(orderData);

        const { data: itemsData } = await supabase
          .from("order_items")
          .select("*, product:products(*), product_variant:product_variants(*)")
          .eq("order_id", orderId);

        setItems(itemsData || []);

        if (orderData.rider_id) {
          const { data: locData } = await supabase
            .from("rider_locations")
            .select("*")
            .eq("rider_id", orderData.rider_id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

          setRiderLocation(locData);
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
          setOrder(payload.new as Order);
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
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted-foreground">Order not found</p>
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
          className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-bold">{order.order_number}</h1>
          <p className="text-xs text-muted-foreground">
            {formatDate(order.created_at)}
          </p>
        </div>
        <Badge className={`${status.color} border-0 ml-auto`}>
          {status.label}
        </Badge>
      </div>

      {/* Rider Map - show when out for delivery */}
      {order.status === "out_for_delivery" && riderLocation && (
        <div className="rounded-xl overflow-hidden shadow-sm">
          <RiderMap
            latitude={riderLocation.latitude}
            longitude={riderLocation.longitude}
          />
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-sm mb-4">Order Status</h2>
        <div className="space-y-0">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    } ${isCurrent ? "ring-2 ring-brand-200" : ""}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div
                      className={`w-0.5 h-8 ${
                        index < currentStepIndex
                          ? "bg-brand-500"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
                <div className="pb-6 pt-1">
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
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-sm mb-3">Order Items</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3"
            >
              <div className="h-14 w-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
                {item.product?.image_url ? (
                  <Image
                    src={item.product.image_url}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Store className="h-6 w-6 text-gray-300" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.product?.name}</p>
                {item.product_variant && (
                  <p className="text-xs text-muted-foreground">
                    {item.product_variant.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                </p>
              </div>
              <p className="font-semibold text-sm">
                {formatCurrency(item.total_price)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold text-sm">Order Details</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Fee</span>
            <span>{formatCurrency(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span>Total</span>
            <span className="text-brand-600">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>

        <div className="border-t pt-3 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
            <p className="text-muted-foreground">{order.delivery_address}</p>
          </div>
          {order.delivery_instructions && (
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                {order.delivery_instructions}
              </p>
            </div>
          )}
        </div>

        <div className="border-t pt-3 text-sm">
          <p className="text-muted-foreground">
            Payment:{" "}
            <span className="font-medium text-gray-900 capitalize">
              {order.payment_method === "cash_on_delivery"
                ? "Cash on Delivery"
                : "GCash"}
            </span>
          </p>
          <p className="text-muted-foreground">
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
