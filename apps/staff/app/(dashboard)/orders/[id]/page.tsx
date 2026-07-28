"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getOrderById } from "@repo/data-access/data/orders";
import { getAvailableRiders } from "@repo/data-access/data/profiles";
import type { Order, Profile } from "@repo/types";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { formatCurrency } from "@repo/utils";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Printer,
  Send,
  User,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";

const statusSteps = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready_for_pickup", label: "Ready for Pickup" },
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
  const [realtimeStatus, setRealtimeStatus] = useState<string>("connecting");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedRiderIds, setSelectedRiderIds] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  const orderId = params.id as string;

  const fetchOrder = useCallback(async () => {
    const data = await getOrderById(supabase, orderId);
    setOrder(data as OrderDetail);
    setLoading(false);
  }, [supabase, orderId]);

  const fetchRiders = useCallback(async () => {
    // Pass current rider ID so they appear in dropdown even if occupied
    const currentRiderId = order?.rider_id || undefined;
    const data = await getAvailableRiders(supabase, currentRiderId);
    setRiders((data as Profile[]) || []);
  }, [supabase, order?.rider_id]);

  useEffect(() => {
    fetchOrder();
    fetchRiders();
  }, [fetchOrder, fetchRiders]);

  // Realtime auto-refresh when order status or rider changes
  useEffect(() => {
    const channel = supabase
      .channel(`staff-order-${orderId}`)
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
          fetchRiders();
        },
      )
      .subscribe((status) => {
        setRealtimeStatus(status === "SUBSCRIBED" ? "connected" : "disconnected");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrder, fetchRiders, orderId, supabase]);

  function toggleRiderSelection(riderId: string) {
    setSelectedRiderIds((prev) => (prev.includes(riderId) ? prev.filter((id) => id !== riderId) : [...prev, riderId]));
  }

  async function sendInvitations() {
    if (!order || selectedRiderIds.length === 0) return;
    setSendingInvites(true);
    try {
      await supabase
        .from("orders")
        .update({
          pending_riders: selectedRiderIds,
          status: "ready_for_pickup",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      const notifications = selectedRiderIds.map((riderId: string) => ({
        user_id: riderId,
        type: "delivery_invitation",
        title: "New Delivery Available",
        message: "A new order is ready for pickup. First to accept gets it!",
        data: { order_id: orderId },
      }));
      await supabase.from("notifications").insert(notifications);
    } catch (err) {
      console.error("Failed to send invitations:", err);
    }
    setSendingInvites(false);
    setInviteModalOpen(false);
    fetchOrder();
  }

  async function updateStatus(status: string) {
    setUpdating(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status }),
      });
      const data = await res.json();
      if (!data.success) {
        console.error("Status update failed:", data.error);
        Swal.fire({ icon: "error", title: "Error", text: data.error || "Unknown error" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      console.error("Status update error:", message);
      Swal.fire({ icon: "error", title: "Error", text: "Network error while updating status. Please try again." });
    }
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
  const kitchenOptions = ["confirmed", "preparing", "ready_for_pickup", "cancelled"];
  const kitchenValue = kitchenOptions.includes(order.status) ? order.status : undefined;

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
            {/* Delivery Proof Photo */}
            {(order as any).delivery_proof_url && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-bold font-display">Proof of Delivery</h2>
                  <div className="mt-2">
                    <img
                      src={(order as any).delivery_proof_url}
                      alt="Delivery proof"
                      className="w-full max-h-64 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Delivery Proof Photo */}
            {(order as any).delivery_proof_url && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-bold font-display">Proof of Delivery</h2>
                  <div className="mt-2">
                    <img
                      src={(order as any).delivery_proof_url}
                      alt="Delivery proof"
                      className="w-full max-h-64 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
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
                {order.rider && (
                  <div className="space-y-2 mb-2">
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
                )}
                {order.status !== "cancelled" && order.status !== "delivered" && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Rider Status</p>
                    {order.rider_id && (order as any).rider?.first_name ? (
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span className="font-medium">
                          {(order as any).rider.first_name} {(order as any).rider.last_name}
                        </span>
                        <span className="text-xs text-green-500">accepted</span>
                        <button
                          onClick={() => setInviteModalOpen(true)}
                          className="ml-auto text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Reassign
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {(order as any).pending_riders?.length > 0 ? (
                            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg flex-1">
                              <Clock className="h-4 w-4 shrink-0" />
                              <span>
                                Awaiting acceptance from {(order as any).pending_riders.length} rider
                                {(order as any).pending_riders.length > 1 ? "s" : ""}
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 flex-1">No riders invited yet</p>
                          )}
                          <Button size="sm" onClick={() => setInviteModalOpen(true)} className="gap-1 shrink-0">
                            <UserPlus className="h-3 w-3" />
                            Invite
                          </Button>
                        </div>
                        {(order as any).pending_riders?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(order as any).pending_riders.map((riderId: string) => {
                              const rider = riders.find((r) => r.id === riderId);
                              return rider ? (
                                <span
                                  key={riderId}
                                  className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                                >
                                  {rider.first_name || rider.full_name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
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
                <h2 className="font-bold mb-3 font-display">Kitchen Actions</h2>
                <div className="flex items-center gap-2">
                  <Select value={kitchenValue} onValueChange={updateStatus} disabled={updating}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Update kitchen status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirm Order</SelectItem>
                      <SelectItem value="preparing">Start Preparing</SelectItem>
                      <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                      <SelectItem value="cancelled" className="text-red-600">
                        Cancel Order
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

      {/* Invite Riders Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Riders</DialogTitle>
            <DialogDescription>Select riders to notify. First to accept gets the delivery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {riders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No riders available</p>
            ) : (
              riders.map((rider) => {
                const isSelected = selectedRiderIds.includes(rider.id);
                return (
                  <button
                    key={rider.id}
                    type="button"
                    onClick={() => toggleRiderSelection(rider.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-brand-500 border-brand-500 text-white" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {rider.first_name || rider.full_name} {rider.last_name || ""}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{rider.rider_status?.replace(/_/g, " ")}</p>
                    </div>
                    {rider.vehicle_type && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        {rider.vehicle_type}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendInvitations}
              disabled={selectedRiderIds.length === 0 || sendingInvites}
              className="gap-2"
            >
              {sendingInvites ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to {selectedRiderIds.length} rider{selectedRiderIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
