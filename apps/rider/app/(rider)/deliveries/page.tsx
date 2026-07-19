"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { getOrdersForRider } from "@repo/data-access/data/orders";
import { format } from "date-fns";
import {
  Bike,
  CheckCircle,
  ChevronRight,
  Clock,
  List,
  Map as MapIcon,
  MapPin,
  Package,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Delivery {
  id: string;
  customer?: { full_name: string; first_name?: string; last_name?: string } | null;
  delivery_address: string;
  total: number;
  delivery_fee: number;
  status: string;
  delivered_at: string;
  created_at: string;
  updated_at: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "delivered", label: "Completed" },
] as const;

const ACTIVE_STATUSES = ["claimed_by_rider", "out_for_delivery", "near_customer"];
const PENDING_STATUSES = ["confirmed", "preparing", "ready_for_pickup"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-amber-100 text-amber-800",
  claimed_by_rider: "bg-cyan-100 text-cyan-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  near_customer: "bg-emerald-100 text-emerald-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

type SortOption = "newest" | "oldest" | "amount_high" | "amount_low";

export default function DeliveriesPage() {
  const supabase = createBrowserTypedClient();
  const [allOrders, setAllOrders] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [restaurantOrigin, setRestaurantOrigin] = useState("10.9501875,122.5065625");

  const fetchOrders = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const orders = await getOrdersForRider(supabase, user.id);
    setAllOrders(orders as Delivery[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchOrders();
    // Fetch restaurant location from DB
    (async () => {
      const { data } = await supabase.from("business_config").select("base_lat, base_lng").limit(1).maybeSingle();
      if (data?.base_lat && data?.base_lng) {
        setRestaurantOrigin(`${data.base_lat},${data.base_lng}`);
      }
    })();
  }, [fetchOrders, supabase]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("rider-deliveries")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, supabase]);

  const filteredOrders = useMemo(() => {
    let result = [...allOrders];

    // Filter by tab
    if (activeTab === "active") result = result.filter((o) => ACTIVE_STATUSES.includes(o.status));
    else if (activeTab === "pending") result = result.filter((o) => PENDING_STATUSES.includes(o.status));
    else if (activeTab === "delivered") result = result.filter((o) => o.status === "delivered");

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) => {
        const customerName = o.customer
          ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.toLowerCase()
          : "";
        return customerName.includes(q) || o.delivery_address.toLowerCase().includes(q);
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "amount_high":
          return (b.total || 0) - (a.total || 0);
        case "amount_low":
          return (a.total || 0) - (b.total || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [allOrders, activeTab, searchQuery, sortBy]);

  const stats = useMemo(
    () => ({
      active: allOrders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      pending: allOrders.filter((o) => PENDING_STATUSES.includes(o.status)).length,
      completed: allOrders.filter((o) => o.status === "delivered").length,
      earnings: allOrders.filter((o) => o.status === "delivered").reduce((sum, d) => sum + (d.delivery_fee || 0), 0),
    }),
    [allOrders],
  );

  // Orders with coordinates for map view
  const ordersWithCoords = filteredOrders.filter((o) => o.delivery_lat && o.delivery_lng && o.status !== "cancelled");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-brand-100 text-center">
          <p className="text-lg font-bold text-gray-800">{stats.active}</p>
          <p className="text-[10px] text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-brand-100 text-center">
          <p className="text-lg font-bold text-gray-800">{stats.pending}</p>
          <p className="text-[10px] text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-brand-100 text-center">
          <p className="text-lg font-bold text-gray-800">{stats.completed}</p>
          <p className="text-[10px] text-gray-500">Done</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 shadow-sm border border-green-100 text-center">
          <p className="text-lg font-bold text-green-700">₱{stats.earnings.toFixed(0)}</p>
          <p className="text-[10px] text-green-600">Earned</p>
        </div>
      </div>

      {/* Search + Sort Row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer or address..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="amount_high">High Amount</option>
          <option value="amount_low">Low Amount</option>
        </select>
        <button
          onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
          className={`p-2.5 rounded-xl border transition ${
            viewMode === "map"
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white text-gray-500 border-gray-200 hover:border-brand-300"
          }`}
          title={viewMode === "list" ? "Map view" : "List view"}
        >
          {viewMode === "list" ? <MapIcon size={18} /> : <List size={18} />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === tab.key ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-64 bg-gray-50 flex items-center justify-center">
            <div className="text-center p-4">
              <MapIcon size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">{ordersWithCoords.length} delivery locations</p>
              <p className="text-xs text-gray-400 mt-1">Open each delivery for navigation directions</p>
              <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                {ordersWithCoords.slice(0, 5).map((o) => (
                  <a
                    key={o.id}
                    href={`https://www.google.com/maps/dir/?api=1&origin=${restaurantOrigin}&destination=${o.delivery_lat},${o.delivery_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <MapPin size={12} />
                    <span className="truncate max-w-[200px]">{o.delivery_address}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders list */}
      <div className="space-y-2">
        {searchQuery && (
          <p className="text-xs text-gray-500 px-1">
            {filteredOrders.length} result{filteredOrders.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
          </p>
        )}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <Package size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No orders found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery
                ? "Try a different search term"
                : activeTab === "delivered"
                  ? "Completed deliveries will appear here"
                  : activeTab === "active"
                    ? "No active deliveries right now"
                    : activeTab === "pending"
                      ? "No pending pickups"
                      : "Assigned orders will appear here"}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isCancelled = order.status === "cancelled";
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className={`block bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition ${
                  isCancelled ? "border-red-100 opacity-60" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-800 truncate">
                      {(() => {
                        const c = order.customer;
                        if (!c) return "Customer";
                        if (c.first_name || c.last_name) {
                          return `${c.first_name || ""} ${c.last_name || ""}`.trim();
                        }
                        return c.full_name || "Customer";
                      })()}
                    </p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="shrink-0" />
                      {order.delivery_address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                        statusColors[order.status] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.status === "delivered"
                        ? "Delivered"
                        : order.status === "cancelled"
                          ? "Cancelled"
                          : order.status.replace(/_/g, " ")}
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {order.updated_at
                      ? format(new Date(order.updated_at), "MMM d, h:mm a")
                      : format(new Date(order.created_at), "MMM d, h:mm a")}
                  </span>
                  {order.status !== "cancelled" && order.delivery_fee > 0 && (
                    <span className="font-medium text-green-600">+₱{Number(order.delivery_fee).toFixed(2)}</span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
