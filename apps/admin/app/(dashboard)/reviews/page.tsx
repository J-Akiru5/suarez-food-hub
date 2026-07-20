"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Search,
  Star,
  ThumbsUp,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

interface Review {
  id: string;
  order_id: string;
  rider_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  rider_name: string;
  customer_name: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const RATING_COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-lime-500",
  5: "bg-green-500",
};

export default function AdminReviewsPage() {
  const supabase = useMemo(() => createBrowserTypedClient(), []);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error: err } = await supabase
        .from("rider_reviews")
        .select(`
          id,
          order_id,
          rider_id,
          user_id,
          rating,
          comment,
          created_at,
          rider:rider_id!inner(full_name),
          customer:user_id!inner(full_name)
        `)
        .order("created_at", { ascending: false });

      if (err) {
        throw new Error(err.message);
      }

      const mapped: Review[] = (data || []).map((r: any) => ({
        id: r.id,
        order_id: r.order_id,
        rider_id: r.rider_id,
        user_id: r.user_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        rider_name: r.rider?.full_name || "Unknown Rider",
        customer_name: r.customer?.full_name || "Unknown Customer",
      }));

      setReviews(mapped);
    } catch (err: any) {
      console.error("Failed to fetch reviews:", err);
      setError(err.message || "Failed to load reviews");
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to load reviews",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Filtered & sorted reviews
  const filtered = useMemo(() => {
    let list = [...reviews];

    if (ratingFilter) {
      list = list.filter((r) => r.rating === ratingFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.rider_name.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q) ||
          r.order_id.toLowerCase().includes(q) ||
          (r.comment && r.comment.toLowerCase().includes(q)),
      );
    }

    switch (sortOrder) {
      case "newest":
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "highest":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "lowest":
        list.sort((a, b) => a.rating - b.rating);
        break;
    }

    return list;
  }, [reviews, ratingFilter, search, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    }
    const withComments = reviews.filter((r) => r.comment).length;
    return { total, avg: Math.round(avg * 10) / 10, distribution, withComments };
  }, [reviews]);

  // Star renderer
  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
    const className = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
    return (
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`${className} ${
              s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
            }`}
          />
        ))}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rider Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer feedback and ratings for delivery riders
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">{error}</div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Average Rating</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-gray-900">{stats.avg}</p>
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">With Comments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.withComments}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">5-Star Reviews</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.distribution[5]}</p>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Rating Distribution</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star];
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <button
                  onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                  className={`text-sm font-medium w-12 text-right hover:text-brand-500 transition-colors ${
                    ratingFilter === star ? "text-brand-600 font-bold" : "text-gray-600"
                  }`}
                >
                  {star} ★
                </button>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${RATING_COLORS[star]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8">{count}</span>
              </div>
            );
          })}
        </div>
        {ratingFilter && (
          <button
            onClick={() => setRatingFilter(null)}
            className="text-xs text-brand-500 hover:text-brand-600 mt-2"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by rider, customer, order ID, or comment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">
            {search || ratingFilter ? "No matching reviews" : "No reviews yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {search || ratingFilter
              ? "Try adjusting your search or filter"
              : "Reviews will appear here once customers rate their deliveries"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </p>
          {filtered.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {renderStars(review.rating, "md")}
                      <span className="text-xs font-medium text-muted-foreground">
                        {RATING_LABELS[review.rating]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        <strong>Rider:</strong> {review.rider_name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <strong>Customer:</strong> {review.customer_name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(review.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>

                {review.comment && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-700 italic">&ldquo;{review.comment}&rdquo;</p>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-mono">
                    Order: {review.order_id.slice(0, 8)}...
                  </span>
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === review.id ? null : review.id)
                    }
                    className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1"
                  >
                    {expandedId === review.id ? (
                      <>
                        Less <ChevronUp className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Details <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>

                {expandedId === review.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Order ID</p>
                      <p className="font-mono break-all">{review.order_id}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Review ID</p>
                      <p className="font-mono break-all">{review.id}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Rider ID</p>
                      <p className="font-mono break-all">{review.rider_id}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">Customer ID</p>
                      <p className="font-mono break-all">{review.user_id}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
