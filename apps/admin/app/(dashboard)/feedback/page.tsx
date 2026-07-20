"use client";

import { format } from "date-fns";
import { ExternalLink, Loader2, MessageCircle, Search, Trash2, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

interface FeedbackEntry {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  message: string;
  page_url: string | null;
  created_at: string;
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/feedback");
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load feedback");
      }

      setFeedback(data.data || []);
    } catch (err: unknown) {
      console.error("Failed to fetch feedback:", err);
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const filtered = useMemo(() => {
    if (!search.trim()) return feedback;
    const q = search.toLowerCase();
    return feedback.filter(
      (f) =>
        f.message.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q),
    );
  }, [feedback, search]);

  const handleDelete = (entry: FeedbackEntry) => {
    Swal.fire({
      title: "Delete Feedback?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        const res = await fetch(`/api/feedback?id=${entry.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Delete failed");

        setFeedback((prev) => prev.filter((f) => f.id !== entry.id));
        Swal.fire({ icon: "success", title: "Deleted", timer: 1500, showConfirmButton: false });
      } catch (err: unknown) {
        Swal.fire({ icon: "error", title: "Error", text: err instanceof Error ? err.message : "Unknown error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All feedback submitted from the website feedback widget and feedback page
          </p>
        </div>
        <button
          type="button"
          onClick={fetchFeedback}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">{error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{feedback.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">With Name</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{feedback.filter((f) => f.name).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">With Email</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{feedback.filter((f) => f.email).length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search feedback by message, name, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">
            {search ? "No matching feedback" : "No feedback yet"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {search
              ? "Try adjusting your search"
              : "Feedback from users will appear here when they submit through the website"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {feedback.length} submission{feedback.length !== 1 ? "s" : ""}
          </p>
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{entry.message}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                      {(entry.name || entry.email) && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {entry.name && <span className="font-medium">{entry.name}</span>}
                          {entry.email && (
                            <a href={`mailto:${entry.email}`} className="text-brand-500 hover:underline">
                              {entry.email}
                            </a>
                          )}
                        </span>
                      )}
                      {entry.page_url && (
                        <a
                          href={entry.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-500 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Page
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <p className="text-xs text-muted-foreground">{format(new Date(entry.created_at), "MMM d, yyyy")}</p>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(entry.created_at), "h:mm a")}</p>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
