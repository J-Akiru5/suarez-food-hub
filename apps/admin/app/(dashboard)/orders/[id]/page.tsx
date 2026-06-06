"use client";

import type { Order, Profile } from "@repo/types";
import type { Database } from "@repo/data-access";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import { ArrowLeft, CheckCircle2, Clock, Loader2, MapPin, Phone, User, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserTypedClient } from "@repo/data-access/client";
import { getOrderById, updateOrderStatus } from "@repo/data-access/data/orders";
import { getRiders } from "@repo/data-access/data/profiles";

const statusSteps = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

interface OrderDetail extends Order {
  profile?: Profile | null;
  items?: any[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createBrowserTypedClient();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [riders, setRiders] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const orderId = params.id as string;

  useEffect(() => {
    fetchOrder();
    fetchRiders();
  }, [orderId]);

  async function fetchOrder() {
    const data = await getOrderById(supabase, orderId);
    setOrder(data as OrderDetail);
    setLoading(false);
  }

  async function fetchRiders() {
    const data = await getRiders(supabase);
    setRiders((data as Profile[]) || []);
  }

  async function assignRider(riderId: string) {
    setUpdating(true);
    await updateOrderStatus(supabase, orderId, "confirmed", { rider_id: riderId });
    await fetchOrder();
    setUpdating(false);
  }

  async function updateStatus(status: string) {
    setUpdating(true);
    await updateOrderStatus(supabase, orderId, status as Database["public"]["Enums"]["order_status"]);
    await fetchOrder();
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-crimson-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Order not found</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">Placed on {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="ml-auto">
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              statusColors[order.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Status Timeline */}
      {!isCancelled && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold mb-4 font-display">Order Status</h2>
            <div className="flex items-center justify-between">
              {statusSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = step.key === order.status;

                return (
                  <div key={step.key} className="flex-1 flex flex-col items-center">
                    <div className="flex items-center w-full">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted ? "bg-crimson-600 text-white" : "bg-gray-200 text-gray-400"
                        } ${isCurrent ? "ring-2 ring-crimson-200" : ""}`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      {idx < statusSteps.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-1 ${idx < currentStepIndex ? "bg-crimson-600" : "bg-gray-200"}`}
                        />
                      )}
                    </div>
                    <p
                      className={`text-[10px] mt-1 text-center ${
                        isCurrent ? "font-bold text-crimson-600" : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isCancelled && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm font-medium text-red-600">This order has been cancelled</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-bold font-display">Customer Details</h2>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span>{order.profile ? `${order.profile.first_name} ${order.profile.last_name}` : "N/A"}</span>
            </div>
            {order.profile?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{order.profile.phone}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span>{order.delivery_address}</span>
            </div>
            {order.delivery_notes && (
              <div className="p-2 bg-yellow-50 rounded-lg text-xs text-yellow-800">Note: {order.delivery_notes}</div>
            )}
          </CardContent>
        </Card>

        {/* Rider Info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="font-bold font-display">Assigned Rider</h2>
            {order.rider ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>
                    {order.rider.first_name} {order.rider.last_name}
                  </span>
                </div>
                {order.rider.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{order.rider.phone}</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">No rider assigned</p>
                {order.status !== "cancelled" && order.status !== "delivered" && (
                  <Select onValueChange={assignRider}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Assign a rider" />
                    </SelectTrigger>
                    <SelectContent>
                      {riders.map((rider) => (
                        <SelectItem key={rider.id} value={rider.id}>
                          {rider.first_name || rider.full_name} {rider.last_name || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-bold mb-3 font-display">Order Items</h2>
          <div className="space-y-2">
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{item.product?.name || "Product"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.unit_price)} x {item.quantity}
                  </p>
                  {item.special_instructions && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                      &quot;{item.special_instructions}&quot;
                    </p>
                  )}
                </div>
                <p className="text-sm font-bold">{formatCurrency(item.total_price)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>{formatCurrency(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-bold mb-2 font-display">Payment</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Method</span>
            <span className="text-sm font-medium">{order.payment_method.replace(/_/g, " ")}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">Status</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                order.payment_status === "verified"
                  ? "bg-green-100 text-green-800"
                  : order.payment_status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {order.payment_status}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Location Map */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-bold mb-3 font-display">Delivery Location</h2>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {order.status !== "cancelled" && order.status !== "delivered" && (
        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold mb-3 font-display">Actions</h2>
            <div className="flex flex-wrap gap-2">
              {order.status === "pending" && (
                <Button
                  onClick={() => updateStatus("confirmed")}
                  disabled={updating}
                  className="bg-crimson-700 hover:bg-crimson-800 text-white"
                >
                  {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirm Order
                </Button>
              )}
              {order.status === "confirmed" && (
                <Button
                  onClick={() => updateStatus("preparing")}
                  disabled={updating}
                  className="bg-crimson-700 hover:bg-crimson-800 text-white"
                >
                  {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Start Preparing
                </Button>
              )}
              {order.status === "preparing" && (
                <Button
                  onClick={() => updateStatus("out_for_delivery")}
                  disabled={updating}
                  className="bg-crimson-700 hover:bg-crimson-800 text-white"
                >
                  {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Mark Out for Delivery
                </Button>
              )}
              {order.status === "out_for_delivery" && (
                <Button
                  onClick={() => updateStatus("delivered")}
                  disabled={updating}
                  className="bg-crimson-700 hover:bg-crimson-800 text-white"
                >
                  {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Mark Delivered
                </Button>
              )}
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => updateStatus("cancelled")}
                disabled={updating}
              >
                Cancel Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
