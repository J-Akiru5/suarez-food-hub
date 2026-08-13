"use client";

import { createBrowserTypedClient } from "@repo/data-access/client";
import { parseServerDate } from "@repo/utils";
import { format } from "date-fns";
import { MessageSquare, Package, Search, Star, ThumbsUp, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Types ───────────────────────────────────
interface RiderReview {
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

interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  product_name: string;
  product_image: string | null;
  customer_name: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const _RATING_COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-lime-500",
  5: "bg-green-500",
};

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const className = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${className} ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </span>
  );
}

// ─── Rider Reviews Tab ───────────────────────
function RiderReviewsTab({ supabase }: { supabase: any }) {
  const [reviews, setReviews] = useState<RiderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, _setRatingFilter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [_expandedId, _setExpandedId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data, error: err } = await supabase
        .from("rider_reviews")
        .select(
          "id, order_id, rider_id, user_id, rating, comment, created_at, rider:rider_id!inner(full_name), customer:user_id!inner(full_name)",
        )
        .order("created_at", { ascending: false });

      if (err) throw new Error(err.message);
      const mapped: RiderReview[] = (data || []).map((r: any) => ({
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
      setError(err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filtered = useMemo(() => {
    let list = [...reviews];
    if (ratingFilter) list = list.filter((r) => r.rating === ratingFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.rider_name.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q) ||
          r.order_id.toLowerCase().includes(q) ||
          r.comment?.toLowerCase().includes(q),
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

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    return {
      total,
      avg: Math.round(avg * 10) / 10,
      distribution,
      withComments: reviews.filter((r) => r.comment).length,
    };
  }, [reviews]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading rider reviews...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Rating</p>
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">5-Star</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.distribution[5]}</p>
        </div>
      </div>

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
          className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-500">
            {search || ratingFilter ? "No matching reviews" : "No rider reviews yet"}
          </h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={review.rating} size="md" />
                      <span className="text-xs font-medium text-muted-foreground">{RATING_LABELS[review.rating]}</span>
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
                      {format(parseServerDate(review.created_at), "MMM d, yyyy")}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Product Reviews Tab ─────────────────────
function ProductReviewsTab({ supabase }: { supabase: any }) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, _setRatingFilter] = useState<number | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data, error: err } = await supabase
        .from("product_reviews")
        .select(
          "id, product_id, user_id, order_id, rating, comment, created_at, product:products!product_reviews_product_id_fkey(name, image_url), customer:user_id!inner(full_name)",
        )
        .order("created_at", { ascending: false });

      if (err) throw new Error(err.message);
      const mapped: ProductReview[] = (data || []).map((r: any) => ({
        id: r.id,
        product_id: r.product_id,
        user_id: r.user_id,
        order_id: r.order_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        product_name: r.product?.name || "Unknown Product",
        product_image: r.product?.image_url || null,
        customer_name: r.customer?.full_name || "Unknown Customer",
      }));
      setReviews(mapped);
    } catch (err: any) {
      setError(err.message || "Failed to load product reviews");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filtered = useMemo(() => {
    let list = [...reviews];
    if (ratingFilter) list = list.filter((r) => r.rating === ratingFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.product_name.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q) ||
          r.comment?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [reviews, ratingFilter, search]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews) distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    return {
      total,
      avg: Math.round(avg * 10) / 10,
      distribution,
      withComments: reviews.filter((r) => r.comment).length,
    };
  }, [reviews]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading product reviews...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Rating</p>
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">5-Star</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.distribution[5]}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by product, customer, or comment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-500">
            {search || ratingFilter ? "No matching reviews" : "No product reviews yet"}
          </h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={review.rating} size="md" />
                      <span className="text-xs font-medium text-muted-foreground">{RATING_LABELS[review.rating]}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {review.product_image && (
                        <img
                          src={review.product_image}
                          alt={review.product_name}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-800">{review.product_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3 inline mr-1" />
                      {review.customer_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(parseServerDate(review.created_at), "MMM d, yyyy")}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────
export default function AdminReviewsPage() {
  const supabase = useMemo(() => createBrowserTypedClient(), []);
  const [tab, setTab] = useState<"rider" | "product">("rider");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">Customer feedback and ratings</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setTab("rider")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${
            tab === "rider" ? "bg-brand-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <User className="h-4 w-4 inline mr-1.5" />
          Rider Reviews
        </button>
        <button
          onClick={() => setTab("product")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${
            tab === "product" ? "bg-brand-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Package className="h-4 w-4 inline mr-1.5" />
          Product Reviews
        </button>
      </div>

      {tab === "rider" ? <RiderReviewsTab supabase={supabase} /> : <ProductReviewsTab supabase={supabase} />}
    </div>
  );
}
