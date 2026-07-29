"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import {
  ArrowRight,
  Bike,
  CheckCircle,
  ChefHat,
  Clock,
  Loader2,
  Navigation,
  Package,
  Search,
  ShoppingBag,
  Star,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
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
  delivery_proof_url: string | null;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending: { label: "Pending", icon: Clock, color: "#f59e0b", bg: "#fffbeb" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "#3b82f6", bg: "#eff6ff" },
  preparing: { label: "Preparing", icon: ChefHat, color: "#8b5cf6", bg: "#f5f3ff" },
  ready_for_pickup: { label: "Ready for Pickup", icon: Package, color: "#06b6d4", bg: "#ecfeff" },
  out_for_delivery: { label: "Out for Delivery", icon: Bike, color: "#06b6d4", bg: "#ecfeff" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "#22c55e", bg: "#f0fdf4" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "#ef4444", bg: "#fef2f2" },
};

const activeStatuses = ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"];

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "all");
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  // Product review state
  const [prodReviewOrder, setProdReviewOrder] = useState<Order | null>(null);
  const [prodReviews, setProdReviews] = useState<Record<string, { rating: number; comment: string }>>({});
  const [submittingProdReview, setSubmittingProdReview] = useState(false);

  // Track which orders have been reviewed (for To Review / History tabs)
  const [riderReviewedIds, setRiderReviewedIds] = useState<Set<string>>(new Set());
  const [productReviewedIds, setProductReviewedIds] = useState<Set<string>>(new Set());
  // Store review data for display in History tab
  const [orderReviewData, setOrderReviewData] = useState<
    Record<
      string,
      {
        rider_review?: { rating: number; comment: string };
        product_reviews?: { product_name: string; rating: number; comment: string }[];
      }
    >
  >({});

  const supabaseRef = useRef(createBrowserTypedClient());

  const fetchOrders = useCallback(
    async (showLoading = true) => {
      if (!user) return;
      if (showLoading) setLoading(true);
      setFetchError("");

      try {
        const res = await fetch(`/api/orders/user/${user.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const response = await res.json();
        const data = response.data || response;
        if (Array.isArray(data)) {
          setOrders(data);

          // Fetch user's reviews to determine which orders are reviewed
          try {
            const [riderReviewsRes, productReviewsRes] = await Promise.all([
              supabaseRef.current.from("rider_reviews").select("order_id, rating, comment").eq("user_id", user.id),
              supabaseRef.current
                .from("product_reviews")
                .select("order_id, product_id, rating, comment, product:products(name)")
                .eq("user_id", user.id),
            ]);

            const rReviewed = new Set<string>();
            const pReviewed = new Set<string>();
            const reviewData: Record<string, any> = {};

            // Process rider reviews
            for (const r of riderReviewsRes.data || []) {
              rReviewed.add(r.order_id);
              if (!reviewData[r.order_id]) reviewData[r.order_id] = {};
              reviewData[r.order_id].rider_review = { rating: r.rating, comment: r.comment || "" };
            }

            // Process product reviews
            for (const r of productReviewsRes.data || []) {
              pReviewed.add(r.order_id);
              if (!reviewData[r.order_id]) reviewData[r.order_id] = {};
              if (!reviewData[r.order_id].product_reviews) reviewData[r.order_id].product_reviews = [];
              const productName = (r as any).product?.name || "Product";
              reviewData[r.order_id].product_reviews.push({
                product_name: productName,
                rating: r.rating,
                comment: r.comment || "",
              });
            }

            setRiderReviewedIds(rReviewed);
            setProductReviewedIds(pReviewed);
            setOrderReviewData(reviewData);
          } catch {
            /* review fetch is non-critical */
          }

          // Fetch rider profiles (non-critical, errors won't break the page)
          try {
            const riderIds = [...new Set((data as any[]).filter((o) => o.rider_id).map((o) => o.rider_id))];
            if (riderIds.length > 0) {
              const { data: riders } = await supabaseRef.current
                .from("profiles")
                .select("id, first_name, last_name")
                .in("id", riderIds);
              if (riders) {
                const riderMap: Record<string, { name: string }> = {};
                for (const r of riders)
                  riderMap[r.id] = { name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || "Rider" };
                setRiderProfiles(riderMap);
              }
            }
          } catch {
            /* rider fetch failure is non-critical */
          }
        }
      } catch {
        setFetchError("Failed to load your orders. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription for live order updates
  useEffect(() => {
    if (!user) return;

    const channel = supabaseRef.current
      .channel(`user-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchOrders(false);
        },
      )
      .subscribe();

    return () => {
      supabaseRef.current.removeChannel(channel);
    };
  }, [user, fetchOrders]);

  const [cancellingId, setCancellingId] = useState("");
  const [riderProfiles, setRiderProfiles] = useState<Record<string, { name: string }>>({});
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  const handleCancel = async (orderId: string) => {
    const result = await Swal.fire({
      title: "Cancel Order?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, cancel order",
    });
    if (!result.isConfirmed) return;

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
      Swal.fire({
        icon: "success",
        title: "Cancelled",
        text: "Your order has been cancelled.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setCancellingId("");
    }
  };

  const timelineSteps = [
    { key: "pending", label: "Pending", icon: Clock, color: "#f59e0b" },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle, color: "#3b82f6" },
    { key: "preparing", label: "Preparing", icon: ChefHat, color: "#8b5cf6" },
    { key: "ready_for_pickup", label: "Ready", icon: Package, color: "#06b6d4" },
    { key: "out_for_delivery", label: "Out for Delivery", icon: Bike, color: "#06b6d4" },
    { key: "delivered", label: "Delivered", icon: CheckCircle, color: "#22c55e" },
  ];

  const getTimelineProgress = (status: string) => {
    const idx = timelineSteps.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : -1;
  };

  const isFullyReviewed = (o: Order) => {
    const hasRiderReview = o.rider_id ? riderReviewedIds.has(o.id) : true;
    const hasProductReview = o.order_items && o.order_items.length > 0 ? productReviewedIds.has(o.id) : true;
    return hasRiderReview && hasProductReview;
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "active") return activeStatuses.includes(o.status);
    if (activeTab === "to_review") return o.status === "delivered" && !isFullyReviewed(o);
    if (activeTab === "history") return o.status === "delivered" && isFullyReviewed(o);
    // "all" tab — show everything EXCEPT delivered (like Shopee/TikTok)
    return o.status !== "delivered";
  });

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

      <style>{`
        @media (max-width: 640px) {
          .order-timeline .timeline-step { gap: 4px !important; }
          .order-timeline .timeline-step-circle { width: 28px !important; height: 28px !important; }
          .order-timeline .timeline-step svg { width: 12px !important; height: 12px !important; }
          .order-timeline .timeline-step span { font-size: 8px !important; margin-top: 4px !important; }
          .order-timeline-timeline { padding: 16px 16px 8px !important; }
          .orders-container { padding: 100px 16px 40px !important; }
          .orders-title { font-size: 28px !important; }
          .order-card-header { padding: 16px 18px !important; }
          .order-card-body { padding: 16px 18px !important; }
          .order-card-footer { padding: 12px 18px !important; flex-direction: column !important; gap: 10px !important; }
          .order-card-footer > div:first-child { font-size: 11px !important; }
          .order-card-footer > div:last-child { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; }
          .order-timeline-wrapper { padding: 16px 18px 8px !important; }
          .order-section-map { padding: 12px 18px !important; }
          .order-section-items { padding: 14px 18px !important; }
          .order-section-rider { padding: 10px 18px !important; }
          .order-section-proof { padding: 12px 18px !important; }
          .tab-button { padding: 8px 16px !important; font-size: 12px !important; }
          .orders-tabs { gap: 6px !important; margin-bottom: 24px !important; }
          .status-badge { padding: 4px 10px !important; font-size: 11px !important; }
          .cancel-btn { padding: 4px 10px !important; font-size: 11px !important; }
          .rider-location-text { font-size: 12px !important; }
          .item-name { font-size: 13px !important; }
        }
      `}</style>

      <div className="orders-container" style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 60px" }}>
        <h1
          className="orders-title"
          style={{
            fontFamily: "var(--playfair-display)",
            fontSize: 40,
            color: "var(--secondary-color)",
            margin: "0 0 8px",
          }}
        >
          {activeTab === "active"
            ? "Active Orders"
            : activeTab === "to_review"
              ? "To Review"
              : activeTab === "history"
                ? "My Reviews"
                : "All Orders"}
        </h1>
        <p style={{ color: "#64748b", margin: "0 0 32px", fontSize: 15 }}>
          {activeTab === "active"
            ? "View your active orders in real-time"
            : activeTab === "to_review"
              ? "Review and rate your completed orders"
              : activeTab === "history"
                ? "Orders you've reviewed"
                : "View all your orders"}
        </p>

        {/* Toggle tabs */}
        <div className="orders-tabs" style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          <button
            className="tab-btn"
            onClick={() => setActiveTab("all")}
            style={{
              padding: "10px 24px",
              borderRadius: 30,
              border: "none",
              background: activeTab === "all" ? "var(--primary-color)" : "#fff",
              color: activeTab === "all" ? "#fff" : "#64748b",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: activeTab === "all" ? "0 8px 20px rgba(177,69,74,0.25)" : "0 4px 12px rgba(0,0,0,0.04)",
              transition: "all 0.2s",
            }}
          >
            All Orders
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className="tab-btn"
            style={{
              padding: "10px 24px",
              borderRadius: 30,
              border: "none",
              background: activeTab === "active" ? "var(--primary-color)" : "#fff",
              color: activeTab === "active" ? "#fff" : "#64748b",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: activeTab === "active" ? "0 8px 20px rgba(177,69,74,0.25)" : "0 4px 12px rgba(0,0,0,0.04)",
              transition: "all 0.2s",
            }}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab("to_review")}
            className="tab-btn"
            style={{
              padding: "10px 24px",
              borderRadius: 30,
              border: "none",
              background: activeTab === "to_review" ? "var(--primary-color)" : "#fff",
              color: activeTab === "to_review" ? "#fff" : "#64748b",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: activeTab === "to_review" ? "0 8px 20px rgba(177,69,74,0.25)" : "0 4px 12px rgba(0,0,0,0.04)",
              transition: "all 0.2s",
            }}
          >
            <Star size={14} style={{ marginRight: 4, display: "inline" }} />
            To Review
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className="tab-btn"
            style={{
              padding: "10px 24px",
              borderRadius: 30,
              border: "none",
              background: activeTab === "history" ? "var(--primary-color)" : "#fff",
              color: activeTab === "history" ? "#fff" : "#64748b",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: activeTab === "history" ? "0 8px 20px rgba(177,69,74,0.25)" : "0 4px 12px rgba(0,0,0,0.04)",
              transition: "all 0.2s",
            }}
          >
            <CheckCircle size={14} style={{ marginRight: 4, display: "inline" }} />
            Reviews
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
              {activeTab === "active"
                ? "No active orders"
                : activeTab === "to_review"
                  ? "All caught up!"
                  : activeTab === "history"
                    ? "No reviews yet"
                    : "No orders yet"}
            </h3>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>
              {activeTab === "active"
                ? "Your active orders will appear here"
                : activeTab === "to_review"
                  ? "You've reviewed all your completed orders"
                  : activeTab === "history"
                    ? "Your reviewed orders will appear here"
                    : "Start by exploring our menu"}
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
                    className="order-card-header"
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
                      {order.status === "pending" && order.payment_method === "cod" && (
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
                    <div
                      className="order-timeline order-timeline-wrapper"
                      style={{ padding: "24px 28px 8px", borderBottom: "1px solid #f1f5f9" }}
                    >
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
                              className="timeline-step"
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
                                className="timeline-step-circle"
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
                        {/* Connector line */}
                        <div
                          style={{
                            position: "absolute",
                            top: 17,
                            left: "10%",
                            right: "10%",
                            height: 2,
                            background: "#e2e8f0",
                            zIndex: 0,
                          }}
                        >
                          {order.status !== "cancelled" && (
                            <div
                              style={{
                                height: "100%",
                                background: "var(--primary-color)",
                                width: `${(Math.max(0, getTimelineProgress(order.status)) / (timelineSteps.length - 1)) * 100}%`,
                                transition: "width 0.5s",
                                borderRadius: 2,
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Map for delivery-stage orders */}
                  {(order.status === "out_for_delivery" || order.status === "near_customer") &&
                    order.rider_id &&
                    order.delivery_lat &&
                    order.delivery_lng && (
                      <div className="order-section-map" style={{ padding: "16px 28px" }}>
                        <div
                          className="rider-location-text"
                          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}
                        >
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
                  <div className="order-section-items" style={{ padding: "20px 28px" }}>
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
                          {" "}
                          <span
                            className="item-name"
                            style={{ fontWeight: 700, color: "var(--secondary-color)", fontSize: 14 }}
                          >
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

                    {/* Receipt Summary */}
                    {order.order_items && order.order_items.length > 0 && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "2px dashed #f1f5f9" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 8,
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          <span>Subtotal</span>
                          <span>₱{order.subtotal}</span>
                        </div>
                        <div
                          style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b" }}
                        >
                          <span>Delivery Fee</span>
                          <span>₱{order.delivery_fee}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rider Info */}
                  {order.rider_id && riderProfiles[order.rider_id] && (
                    <div
                      className="order-section-rider"
                      style={{
                        padding: "12px 28px",
                        background: "#f8fafc",
                        borderTop: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Bike size={16} color="var(--primary-color)" />
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        Delivery Rider:{" "}
                        <strong style={{ color: "var(--secondary-color)" }}>
                          {riderProfiles[order.rider_id].name}
                        </strong>
                      </span>
                    </div>
                  )}

                  {/* Proof of Delivery Photo */}
                  {order.delivery_proof_url && (
                    <div
                      className="order-section-proof"
                      style={{
                        padding: "16px 28px",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 10px",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--secondary-color)",
                        }}
                      >
                        📸 Proof of Delivery
                      </p>
                      <div
                        onClick={() => setProofModalUrl(order.delivery_proof_url)}
                        style={{
                          borderRadius: 16,
                          overflow: "hidden",
                          border: "1px solid #f1f5f9",
                          position: "relative",
                          cursor: "pointer",
                          background: "#f8fafc",
                        }}
                      >
                        <img
                          src={order.delivery_proof_url}
                          alt="Delivery proof"
                          style={{
                            width: "100%",
                            maxHeight: 200,
                            objectFit: "cover",
                            display: "block",
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(0,0,0,0.18)",
                            opacity: 1,
                            transition: "opacity 0.2s",
                          }}
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.9)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backdropFilter: "blur(4px)",
                            }}
                          >
                            <Search size={20} style={{ color: "var(--secondary-color)" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div
                    className="order-card-footer"
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
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      {order.status === "delivered" && activeTab !== "history" && (
                        <>
                          {order.rider_id && !riderReviewedIds.has(order.id) && (
                            <button
                              onClick={() => {
                                setReviewOrder(order);
                                setReviewRating(0);
                                setReviewComment("");
                              }}
                              style={{
                                background: "#f59e0b",
                                border: "none",
                                padding: "8px 16px",
                                borderRadius: 12,
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Star size={14} />
                              Rate Delivery
                            </button>
                          )}
                          {order.order_items && order.order_items.length > 0 && !productReviewedIds.has(order.id) && (
                            <button
                              onClick={() => {
                                setProdReviewOrder(order);
                                const initial: Record<string, any> = {};
                                for (const item of order.order_items) {
                                  const pid = (item as any).product_id || item.id;
                                  if (!initial[pid]) {
                                    initial[pid] = { rating: 0, comment: "", productName: item.product_name };
                                  }
                                }
                                setProdReviews(initial);
                              }}
                              style={{
                                background: "#8b5cf6",
                                border: "none",
                                padding: "8px 16px",
                                borderRadius: 12,
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Star size={14} />
                              Rate Products
                            </button>
                          )}
                        </>
                      )}
                      {/* Show review content in history tab */}
                      {activeTab === "history" && orderReviewData[order.id] && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          {orderReviewData[order.id]?.rider_review && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 10px",
                                background: "#fffbeb",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            >
                              <Star size={12} style={{ fill: "#f59e0b", color: "#f59e0b" }} />
                              <span style={{ fontWeight: 700, color: "#92400e" }}>
                                {orderReviewData[order.id]?.rider_review?.rating}
                              </span>
                            </div>
                          )}
                          {orderReviewData[order.id]?.product_reviews?.map((pr: any, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 10px",
                                background: "#f5f3ff",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            >
                              <Star size={12} style={{ fill: "#8b5cf6", color: "#8b5cf6" }} />
                              <span style={{ fontWeight: 700, color: "#5b21b6" }}>
                                {pr.product_name}: {pr.rating}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => setReceiptOrder(order)}
                        style={{
                          background: "transparent",
                          border: "1px solid #e2e8f0",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "#64748b",
                        }}
                      >
                        View Receipt
                      </button>
                      <div style={{ fontWeight: 800, fontSize: 18, color: "var(--secondary-color)" }}>
                        ₱{order.total}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Review Modal */}
        {reviewOrder && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
            }}
            onClick={() => !submittingReview && setReviewOrder(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 380,
                background: "#fff",
                borderRadius: 24,
                padding: 32,
                textAlign: "center",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--playfair-display)",
                  fontSize: 22,
                  color: "var(--secondary-color)",
                  margin: "0 0 4px",
                }}
              >
                Rate Your Delivery
              </h3>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 20px" }}>How was your delivery experience?</p>

              {/* Stars */}
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    disabled={submittingReview}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: submittingReview ? "not-allowed" : "pointer",
                      padding: 4,
                      transition: "transform 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!submittingReview) {
                        const stars = e.currentTarget.parentElement?.children;
                        if (stars) {
                          for (let i = 0; i < stars.length; i++) {
                            (stars[i] as HTMLElement).style.transform = i < star ? "scale(1.15)" : "scale(1)";
                          }
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      const stars = e.currentTarget.parentElement?.children;
                      if (stars) {
                        for (let i = 0; i < stars.length; i++) {
                          (stars[i] as HTMLElement).style.transform = "scale(1)";
                        }
                      }
                    }}
                  >
                    <Star
                      size={36}
                      style={{
                        fill: star <= reviewRating ? "#f59e0b" : "#e2e8f0",
                        color: star <= reviewRating ? "#f59e0b" : "#e2e8f0",
                        transition: "all 0.15s",
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                disabled={submittingReview}
                placeholder="Optional: share your feedback about the delivery..."
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "none",
                  minHeight: 80,
                  marginBottom: 16,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <button
                onClick={async () => {
                  if (!reviewOrder.rider_id || reviewRating === 0) return;
                  setSubmittingReview(true);
                  try {
                    const res = await fetch("/api/reviews", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        order_id: reviewOrder.id,
                        rider_id: reviewOrder.rider_id,
                        rating: reviewRating,
                        comment: reviewComment,
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      // Update rider reviewed state
                      setRiderReviewedIds((prev) => new Set(prev).add(reviewOrder.id));
                      setOrderReviewData((prev) => ({
                        ...prev,
                        [reviewOrder.id]: {
                          rider_review: { rating: reviewRating, comment: reviewComment },
                          product_reviews: prev[reviewOrder.id]?.product_reviews || [],
                        },
                      }));
                      Swal.fire({
                        icon: "success",
                        title: "Thank you!",
                        text: "Your feedback helps us improve.",
                        timer: 2000,
                        showConfirmButton: false,
                      });
                      setReviewOrder(null);
                      setReviewRating(0);
                      setReviewComment("");
                    } else {
                      Swal.fire({ icon: "error", title: "Failed", text: data.error || "Please try again." });
                    }
                  } catch {
                    Swal.fire({ icon: "error", title: "Error", text: "Network error. Please try again." });
                  }
                  setSubmittingReview(false);
                }}
                disabled={reviewRating === 0 || submittingReview}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 14,
                  border: "none",
                  background: reviewRating === 0 ? "#e2e8f0" : "var(--primary-color)",
                  color: reviewRating === 0 ? "#94a3b8" : "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: reviewRating === 0 || submittingReview ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {submittingReview ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </div>
        )}

        {/* Product Review Modal */}
        {prodReviewOrder && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
            }}
            onClick={() => !submittingProdReview && setProdReviewOrder(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 420,
                background: "#fff",
                borderRadius: 24,
                padding: 32,
                maxHeight: "90vh",
                overflowY: "auto",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--playfair-display)",
                  fontSize: 22,
                  color: "var(--secondary-color)",
                  margin: "0 0 4px",
                  textAlign: "center",
                }}
              >
                Rate Your Items
              </h3>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 20px", textAlign: "center" }}>
                How were the food items?
              </p>

              {Object.entries(prodReviews).map(([pid, reviewData]: [string, any]) => (
                <div key={pid} style={{ marginBottom: 20, padding: 16, background: "#f8fafc", borderRadius: 16 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--secondary-color)", margin: "0 0 8px" }}>
                    {reviewData.productName}
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() =>
                          setProdReviews((prev) => ({
                            ...prev,
                            [pid]: { ...prev[pid], rating: star },
                          }))
                        }
                        disabled={submittingProdReview}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: submittingProdReview ? "not-allowed" : "pointer",
                          padding: 4,
                        }}
                      >
                        <Star
                          size={28}
                          style={{
                            fill: star <= (prodReviews[pid]?.rating || 0) ? "#f59e0b" : "#e2e8f0",
                            color: star <= (prodReviews[pid]?.rating || 0) ? "#f59e0b" : "#e2e8f0",
                            transition: "all 0.15s",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={prodReviews[pid]?.comment || ""}
                    onChange={(e) =>
                      setProdReviews((prev) => ({
                        ...prev,
                        [pid]: { ...prev[pid], comment: e.target.value },
                      }))
                    }
                    disabled={submittingProdReview}
                    placeholder="Optional comment..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontFamily: "inherit",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}

              <button
                onClick={async () => {
                  setSubmittingProdReview(true);
                  let success = true;
                  for (const [pid, review] of Object.entries(prodReviews)) {
                    if (!(review as any)?.rating) continue;
                    try {
                      const res = await fetch("/api/reviews/products", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          product_id: pid,
                          order_id: prodReviewOrder.id,
                          rating: (review as any).rating,
                          comment: (review as any).comment || "",
                        }),
                      });
                      const data = await res.json();
                      if (!data.success) success = false;
                    } catch {
                      success = false;
                    }
                  }
                  setSubmittingProdReview(false);
                  if (success) {
                    setProductReviewedIds((prev) => new Set(prev).add(prodReviewOrder.id));
                    setOrderReviewData((prev) => {
                      const existing = prev[prodReviewOrder.id] || {};
                      const productReviews = Object.entries(prodReviews).map(([_, r]: [string, any]) => ({
                        product_name: r.productName,
                        rating: r.rating || 5,
                        comment: r.comment || "",
                      }));
                      return {
                        ...prev,
                        [prodReviewOrder.id]: {
                          ...existing,
                          product_reviews: productReviews,
                        },
                      };
                    });
                    Swal.fire({
                      icon: "success",
                      title: "Thank you!",
                      text: "Your product ratings help us improve!",
                      timer: 2000,
                      showConfirmButton: false,
                    });
                    setProdReviewOrder(null);
                    setProdReviews({});
                  } else {
                    Swal.fire({ icon: "error", title: "Error", text: "Some reviews failed to save." });
                  }
                }}
                disabled={submittingProdReview || Object.values(prodReviews).every((r) => !r.rating)}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 14,
                  border: "none",
                  marginBottom: 4,
                  background:
                    submittingProdReview || Object.values(prodReviews).every((r) => !r.rating) ? "#e2e8f0" : "#8b5cf6",
                  color:
                    submittingProdReview || Object.values(prodReviews).every((r) => !r.rating) ? "#94a3b8" : "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor:
                    submittingProdReview || Object.values(prodReviews).every((r) => !r.rating)
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {submittingProdReview
                  ? "Submitting..."
                  : Object.values(prodReviews).every((r) => !r.rating)
                    ? "Tap stars above to rate"
                    : "Submit Product Ratings"}
              </button>

              {/* Cancel link */}
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <button
                  onClick={() => {
                    setProdReviewOrder(null);
                    setProdReviews({});
                  }}
                  disabled={submittingProdReview}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: 13,
                    cursor: submittingProdReview ? "not-allowed" : "pointer",
                    padding: "6px 12px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {receiptOrder && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 20,
            }}
            onClick={() => setReceiptOrder(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 340,
                background: "#f1f5f9",
                borderRadius: 24,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                maxHeight: "90vh",
              }}
            >
              {/* Receipt Paper */}
              <div className="bg-white rounded-t-2xl shadow-sm flex-shrink-0 mx-4 mt-4">
                <div className="px-5 py-4 border-b-2 border-dashed border-gray-200 text-center relative">
                  <button
                    onClick={() => setReceiptOrder(null)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8",
                    }}
                  >
                    <XCircle size={20} />
                  </button>
                  <h3
                    className="text-sm font-bold text-gray-700 tracking-widest m-0 uppercase"
                    style={{ fontFamily: "monospace" }}
                  >
                    Suarez Food Hub
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1 mb-0" style={{ fontFamily: "monospace" }}>
                    RECEIPT # {receiptOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 mb-0" style={{ fontFamily: "monospace" }}>
                    {new Date(receiptOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex-1 bg-white overflow-y-auto px-5 py-4 mx-4">
                <div className="space-y-4">
                  {receiptOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="pb-3 border-b border-dashed border-gray-200 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p
                            className="text-xs font-bold text-gray-800 uppercase tracking-wide m-0"
                            style={{ fontFamily: "monospace" }}
                          >
                            {item.quantity}x {item.product_name}
                          </p>
                          {item.variant_name && (
                            <p className="text-[10px] text-gray-400 mt-0.5 mb-0" style={{ fontFamily: "monospace" }}>
                              {item.variant_name}
                            </p>
                          )}
                        </div>
                        <p
                          className="text-xs font-bold text-gray-800 m-0 text-right"
                          style={{ fontFamily: "monospace" }}
                        >
                          ₱{item.total_price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-b-2xl shadow-sm flex-shrink-0 mx-4 mb-4">
                <div className="px-5 py-3 border-t-2 border-dashed border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ fontFamily: "monospace" }}
                    >
                      Subtotal
                    </span>
                    <span className="text-[10px] font-bold text-gray-400" style={{ fontFamily: "monospace" }}>
                      ₱{receiptOrder.subtotal}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-3">
                    <span
                      className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                      style={{ fontFamily: "monospace" }}
                    >
                      Delivery Fee
                    </span>
                    <span className="text-[10px] font-bold text-gray-400" style={{ fontFamily: "monospace" }}>
                      ₱{receiptOrder.delivery_fee}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span
                      className="text-xs font-bold text-gray-800 uppercase tracking-wider"
                      style={{ fontFamily: "monospace" }}
                    >
                      Total
                    </span>
                    <span
                      className="text-sm font-bold text-brand-500"
                      style={{ fontFamily: "monospace", color: "var(--primary-color)" }}
                    >
                      ₱{receiptOrder.total}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Image Modal */}
      {proofModalUrl && (
        <div
          onClick={() => setProofModalUrl(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            backdropFilter: "blur(8px)",
          }}
        >
          <button
            onClick={() => setProofModalUrl(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              backdropFilter: "blur(4px)",
            }}
          >
            <XCircle size={24} />
          </button>
          <img
            src={proofModalUrl}
            alt="Delivery proof (full size)"
            style={{
              maxWidth: "100%",
              maxHeight: "90vh",
              borderRadius: 12,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              objectFit: "contain",
            }}
          />
        </div>
      )}
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
