"use client";

import type { Database } from "@repo/data-access";
import { createBrowserTypedClient } from "@repo/data-access/client";
import { getOrderById, updateOrderStatus } from "@repo/data-access/data/orders";
import { getRiders } from "@repo/data-access/data/profiles";
import type { Order, Profile } from "@repo/types";
import { Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Phone, Printer, User, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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

  const fetchOrder = useCallback(async () => {
    const data = await getOrderById(supabase, orderId);
    setOrder(data as OrderDetail);
    setLoading(false);
  }, [supabase, orderId]);

  const fetchRiders = useCallback(async () => {
    const data = await getRiders(supabase);
    setRiders((data as Profile[]) || []);
  }, [supabase]);

  useEffect(() => {
    fetchOrder();
    fetchRiders();
  }, [fetchOrder, fetchRiders]);

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

  async function updatePaymentStatus(payment_status: string) {
    setUpdating(true);
    await supabase.from("orders").update({ payment_status }).eq("id", orderId);
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
    <>
      <div className="space-y-6 max-w-7xl mx-auto print:hidden">
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
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 print:hidden">
              <Printer className="h-4 w-4" />
              Print
            </Button>
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
              <div className="relative flex items-center justify-between pt-2 overflow-x-auto pb-2">
                {/* Background line */}
                <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />
                {/* Active line */}
                <div
                  className="absolute top-6 left-[10%] h-0.5 bg-crimson-600 z-0 transition-all duration-500"
                  style={{ width: `${Math.max(0, currentStepIndex) * (80 / (statusSteps.length - 1))}%` }}
                />

                {statusSteps.map((step, idx) => {
                  const isCompleted = idx <= currentStepIndex;
                  const isCurrent = step.key === order.status;

                  return (
                    <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isCompleted ? "bg-crimson-600 text-white" : "bg-gray-200 text-gray-400"
                        } ${isCurrent ? "ring-4 ring-crimson-100" : ""}`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <p
                        className={`text-[10px] sm:text-xs mt-2 text-center transition-colors ${
                          isCurrent ? "font-bold text-crimson-600" : "text-gray-500 font-medium"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (Wider) */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
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
            {/* Delivery Location Map */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold font-display m-0">Delivery Location</h2>
                  {order.delivery_lat && order.delivery_lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-crimson-600 font-bold hover:underline flex items-center gap-1 bg-crimson-50 px-2 py-1 rounded-md"
                    >
                      <MapPin className="h-3 w-3" />
                      Navigate
                    </a>
                  )}
                </div>
                <div className="h-64 bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center justify-center p-6 text-center">
                  <MapPin className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-base font-medium text-gray-800">{order.delivery_address}</p>
                  {order.delivery_lat && order.delivery_lng && (
                    <p className="text-xs text-gray-400 mt-3 font-mono bg-gray-100 px-2 py-1 rounded">
                      GPS: {order.delivery_lat.toFixed(6)}, {order.delivery_lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Narrower) */}
          <div className="space-y-6 min-w-0">
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
                  <div className="p-2 bg-yellow-50 rounded-lg text-xs text-yellow-800">
                    Note: {order.delivery_notes}
                  </div>
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
            {/* Payment Info */}
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold mb-2 font-display">Payment</h2>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Method</span>
                  <span className="text-sm font-medium">{order.payment_method.replace(/_/g, " ")}</span>
                </div>
                {order.payment_method === "gcash" && order.gcash_reference_no && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Ref No.</span>
                    <span className="text-sm font-mono bg-gray-50 px-2 py-0.5 rounded">{order.gcash_reference_no}</span>
                  </div>
                )}
                {order.payment_method === "maya" && order.maya_reference_no && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Ref No.</span>
                    <span className="text-sm font-mono bg-gray-50 px-2 py-0.5 rounded">{order.maya_reference_no}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Select value={order.payment_status} onValueChange={updatePaymentStatus} disabled={updating}>
                    <SelectTrigger className="w-[140px] h-8 text-xs font-medium">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            {/* Actions */}
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold mb-3 font-display">Update Order Status</h2>
                <div className="flex items-center gap-2">
                  <Select value={order.status} onValueChange={updateStatus} disabled={updating}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select order status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="preparing">Preparing</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled" className="text-red-600">
                        Cancelled
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {updating && <Loader2 className="h-5 w-5 animate-spin text-gray-400 shrink-0" />}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Printable Receipt (only visible on print) */}
      <div className="hidden print:block font-mono bg-white text-black p-4 w-full">
        <div className="text-center mb-6 border-b-2 border-dashed border-black pb-4">
          <h1 className="font-bold text-2xl uppercase m-0">Suarez Food Hub</h1>
          <p className="text-sm mt-1">RECEIPT # {order.order_number}</p>
          <p className="text-xs">{new Date(order.created_at).toLocaleString()}</p>
        </div>

        <div className="space-y-2 mb-6 text-sm">
          <p>
            <strong>Customer:</strong>{" "}
            {order.profile ? `${order.profile.first_name} ${order.profile.last_name}` : "N/A"}
          </p>
          {order.profile?.phone && (
            <p>
              <strong>Phone:</strong> {order.profile.phone}
            </p>
          )}
          <p>
            <strong>Address:</strong> {order.delivery_address}
          </p>
          <p>
            <strong>Method:</strong> {order.payment_method === "cod" ? "Cash on Delivery" : "GCash"}
          </p>
        </div>

        <div className="border-b border-dashed border-black pb-4 mb-4">
          <div className="flex justify-between font-bold text-sm mb-2 uppercase">
            <span>Item</span>
            <span>Amount</span>
          </div>
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm mb-1">
              <span className="pr-4">
                {item.quantity}x {item.product?.name || "Product"}
              </span>
              <span>{formatCurrency(item.total_price)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 mb-8 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>{formatCurrency(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-dashed border-black">
            <span>TOTAL</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div className="text-center text-sm font-bold mt-10">THANK YOU FOR YOUR ORDER!</div>
      </div>
    </>
  );
}
