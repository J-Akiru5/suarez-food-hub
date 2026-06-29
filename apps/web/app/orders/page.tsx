"use client";

import {
  ArrowRight,
  Bike,
  CheckCircle,
  ChefHat,
  Clock,
  Loader2,
  Navigation,
  Package,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AuthNavbar from "../../components/AuthNavbar";
import { useAuth } from "../../components/auth-provider";

const CustomerDeliveryMap = dynamic(() => import("../../components/CustomerDeliveryMap"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />,
});

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  status: string;
  payment_method: string;
  payment_status: string;
  delivery_address: string;
  delivery_contact: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  order_items: OrderItem[];
  rider_id: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending: { label: "Pending", icon: Clock, color: "#f59e0b", bg: "#fffbeb" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "#3b82f6", bg: "#eff6ff" },
  preparing: { label: "Preparing", icon: ChefHat, color: "#8b5cf6", bg: "#f5f3ff" },
  out_for_delivery: { label: "Out for Delivery", icon: Bike, color: "#06b6d4", bg: "#ecfeff" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "#22c55e", bg: "#f0fdf4" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "#ef4444", bg: "#fef2f2" },
};

const activeStatuses = ["pending", "confirmed", "preparing", "out_for_delivery"];

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(searchParams.get("active") === "true");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setFetchError("");

    fetch(`/api/orders/user/${user.id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(() => setFetchError("Failed to load your orders. Please try again."))
      .finally(() => setLoading(false));
  }, [user]);

  const [cancellingId, setCancellingId] = useState("");

  const handleCancel = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancellingId("");
    }
  };

  const timelineSteps = [
    { key: "pending", label: "Pending", icon: Clock, color: "#f59e0b" },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle, color: "#3b82f6" },
    { key: "preparing", label: "Preparing", icon: ChefHat, color: "#8b5cf6" },
    { key: "out_for_delivery", label: "Out for Delivery", icon: Bike, color: "#06b6d4" },
    { key: "delivered", label: "Delivered", icon: CheckCircle, color: "#22c55e" },
  ];

  const getTimelineProgress = (status: string) => {
    const idx = timelineSteps.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : -1;
  };

  const filteredOrders = showActiveOnly ? orders.filter((o) => activeStatuses.includes(o.status)) : orders;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-cream)", fontFamily: "var(--plus-jakarta-sans)" }}>
      <AuthNavbar />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 60px" }}>
        <h1
          style={{
            fontFamily: "var(--playfair-display)",
            fontSize: 40,
            color: "var(--secondary-color)",
            margin: "0 0 8px",
          }}
        >
          {showActiveOnly ? "Track Order" : "My Orders"}
        </h1>
        <p style={{ color: "#64748b", margin: "0 0 32px", fontSize: 15 }}>
          {showActiveOnly ? "View your active orders in real-time" : "View all your past and current orders"}
        </p>

        {/* Toggle tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          <button
            onClick={() => setShowActiveOnly(false)}
            style={{
              padding: "10px 24px",
              borderRadius: 30,
              border: "none",
              background: !showActiveOnly ? "var(--primary-color)" : "#fff",
              color: !showActiveOnly ? "#fff" : "#64748b",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: !showActiveOnly ? "0 8px 20px rgba(177,69,74,0.25)" : "0 4px 12px rgba(0,0,0,0.04)",
              transition: "all 0.2s",
            }}
          >
            All Orders
          </button>
          <button
            onClick={() => setShowActiveOnly(true)}
            style={{
              padding: "10px 24px",
              borderRadius: 30,
              border: "none",
              background: showActiveOnly ? "var(--primary-color)" : "#fff",
              color: showActiveOnly ? "#fff" : "#64748b",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: showActiveOnly ? "0 8px 20px rgba(177,69,74,0.25)" : "0 4px 12px rgba(0,0,0,0.04)",
              transition: "all 0.2s",
            }}
          >
            <Bike size={16} style={{ marginRight: 6, display: "inline" }} />
            Active Orders
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ background: "#fff", borderRadius: 28, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.04)" }}
              >
                <div style={{ width: "40%", height: 20, background: "#f1f5f9", borderRadius: 8, marginBottom: 12 }} />
                <div style={{ width: "60%", height: 14, background: "#f1f5f9", borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(239,68,68,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <XCircle size={36} color="#ef4444" style={{ opacity: 0.4 }} />
            </div>
            <h3 style={{ fontFamily: "var(--playfair-display)", fontSize: 24, color: "#ef4444", margin: 0 }}>
              Something went wrong
            </h3>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>{fetchError}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 20,
                padding: "14px 32px",
                borderRadius: 30,
                border: "none",
                background: "var(--primary-color)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Refresh Page
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(177,69,74,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <ShoppingBag size={36} color="var(--primary-color)" style={{ opacity: 0.4 }} />
            </div>
            <h3
              style={{
                fontFamily: "var(--playfair-display)",
                fontSize: 24,
                color: "var(--secondary-color)",
                margin: 0,
              }}
            >
              {showActiveOnly ? "No active orders" : "No orders yet"}
            </h3>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>
              {showActiveOnly ? "Your active orders will appear here" : "Start by exploring our menu"}
            </p>
            <button
              onClick={() => router.push("/menu")}
              style={{
                marginTop: 20,
                padding: "14px 32px",
                borderRadius: 30,
                border: "none",
                background: "var(--primary-color)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Browse Menu <ArrowRight size={16} style={{ marginLeft: 6, display: "inline" }} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {filteredOrders.map((order) => {
              const statusInfo = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    borderRadius: 28,
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      padding: "24px 28px",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", fontFamily: "monospace" }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {order.status === "pending" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(order.id);
                          }}
                          disabled={cancellingId === order.id}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 20,
                            border: "1px solid #ef4444",
                            background: "#fff",
                            color: "#ef4444",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: cancellingId === order.id ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            opacity: cancellingId === order.id ? 0.6 : 1,
                          }}
                        >
                          {cancellingId === order.id ? <Loader2 size={14} /> : <XCircle size={14} />}
                          {cancellingId === order.id ? "Cancelling..." : "Cancel"}
                        </button>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 14px",
                          borderRadius: 20,
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        <StatusIcon size={16} />
                        {statusInfo.label}
                      </div>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  {order.status !== "cancelled" && (
                    <div style={{ padding: "24px 28px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          position: "relative",
                        }}
                      >
                        {timelineSteps.map((step, i) => {
                          const progress = getTimelineProgress(order.status);
                          const isActive = i <= progress;
                          const isCurrent = i === progress;
                          const StepIcon = step.icon;
                          return (
                            <div
                              key={step.key}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                position: "relative",
                                zIndex: 1,
                                flex: 1,
                              }}
                            >
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: isActive ? step.color : "#e2e8f0",
                                  color: "#fff",
                                  transition: "all 0.3s",
                                  boxShadow: isCurrent ? `0 0 0 4px ${step.color}33` : "none",
                                }}
                              >
                                <StepIcon size={16} />
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  marginTop: 6,
                                  fontWeight: 600,
                                  color: isActive ? step.color : "#94a3b8",
                                  textAlign: "center",
                                }}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Connector line */}
                      <div
                        style={{
                          position: "relative",
                          height: 2,
                          background: "#e2e8f0",
                          margin: "-20px 18px 0",
                          zIndex: 0,
                        }}
                      >
                        {order.status !== "cancelled" && (
                          <div
                            style={{
                              height: "100%",
                              background: "var(--primary-color)",
                              width: `${Math.max(0, getTimelineProgress(order.status)) * 25}%`,
                              transition: "width 0.5s",
                              borderRadius: 2,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Live Map for delivery-stage orders */}
                  {(order.status === "out_for_delivery" || order.status === "near_customer") &&
                    order.rider_id &&
                    order.delivery_lat &&
                    order.delivery_lng && (
                      <div style={{ padding: "16px 28px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <Navigation size={16} color="var(--primary-color)" />
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--secondary-color)" }}>
                            Rider Location
                          </span>
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>Live</span>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#22c55e",
                              animation: "pulse 2s infinite",
                            }}
                          />
                        </div>
                        <CustomerDeliveryMap
                          riderId={order.rider_id}
                          destinationLat={order.delivery_lat}
                          destinationLng={order.delivery_lng}
                          destinationLabel={order.delivery_address}
                        />
                      </div>
                    )}

                  {/* Items */}
                  <div style={{ padding: "20px 28px" }}>
                    {order.order_items?.map((item: OrderItem) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: "1px solid #f8fafc",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, color: "var(--secondary-color)", fontSize: 14 }}>
                            {item.product_name}
                          </span>
                          {item.variant_name && (
                            <span style={{ color: "#94a3b8", fontSize: 13, marginLeft: 8 }}>({item.variant_name})</span>
                          )}
                          <span style={{ color: "#94a3b8", fontSize: 13, marginLeft: 8 }}>x{item.quantity}</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--primary-color)" }}>
                          ₱{item.total_price}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      padding: "16px 28px",
                      background: "#fafafa",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#94a3b8" }}>
                      {order.payment_method === "cod" ? "Cash on Delivery" : "GCash"} ·{" "}
                      {order.payment_method === "cod" ? `₱${order.total}` : "Paid"}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: "var(--secondary-color)" }}>₱{order.total}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "var(--color-cream)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Loader2 size={40} style={{ color: "var(--primary-color)" }} className="animate-spin" />
        </div>
      }
    >
      <OrdersPageInner />
    </Suspense>
  );
}
