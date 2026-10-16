"use client";

import { formatCurrency, parseServerDate } from "@repo/utils";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  Timer,
  UserPlus,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

interface RankedRider {
  id: string;
  full_name: string;
  phone: string | null;
  rider_status: string | null;
  active_count: number;
  last_delivered_at: string | null;
  under_cap: boolean;
  idle_minutes: number;
}

interface DispatchOrder {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  created_at: string;
  delivery_address: string;
  item_count?: { count: number }[];
}

interface AwaitingOrder {
  id: string;
  order_number: string;
  rider_id: string;
  rider_assigned_at: string | null;
  rider?: { first_name: string | null; last_name: string | null } | null;
}

interface DispatchLogEntry {
  id: string;
  order_id: string;
  rider_id: string | null;
  action: string;
  created_at: string;
  order?: { order_number: string } | null;
  r?: { first_name: string | null; last_name: string | null } | null;
}

interface Board {
  riders: RankedRider[];
  unassigned: DispatchOrder[];
  awaiting: AwaitingOrder[];
  log: DispatchLogEntry[];
  max_active_deliveries: number;
}

const actionLabels: Record<string, { label: string; cls: string }> = {
  assigned: { label: "Assigned", cls: "bg-blue-100 text-blue-700" },
  cascaded: { label: "Cascaded", cls: "bg-amber-100 text-amber-700" },
  accepted: { label: "Accepted", cls: "bg-green-100 text-green-700" },
  declined: { label: "Declined", cls: "bg-red-100 text-red-700" },
  revoked: { label: "Revoked", cls: "bg-gray-100 text-gray-700" },
  timeout: { label: "Timed out", cls: "bg-orange-100 text-orange-700" },
  exhausted: { label: "No riders", cls: "bg-red-100 text-red-700" },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.floor((Date.now() - parseServerDate(iso).getTime()) / 60000);
  if (!Number.isFinite(mins)) return "never";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function awaitingAge(iso: string | null): { text: string; urgent: boolean } {
  if (!iso) return { text: "—", urgent: false };
  const mins = Math.floor((Date.now() - parseServerDate(iso).getTime()) / 60000);
  return { text: `${mins}m`, urgent: mins >= 7 };
}

export default function DispatchPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [manualFor, setManualFor] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const fetchBoard = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/dispatch");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setBoard(data.data as Board);
        setError(null);
      } else {
        // Never fall through to "All caught up" on a failed load — that would hide waiting orders.
        setError(data?.error || `Could not load the dispatch board (HTTP ${res.status}).`);
      }
    } catch {
      setError("Network problem — showing the last board we loaded.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
    const t = setInterval(fetchBoard, 10000); // timeout sweep + freshness fallback
    return () => clearInterval(t);
  }, [fetchBoard]);

  // Realtime: order lifecycle and rider status changes both matter here.
  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};
    (async () => {
      const { createBrowserTypedClient } = await import("@repo/data-access/client");
      if (cancelled) return; // unmounted while the client was loading — don't leak a channel
      const supabase = createBrowserTypedClient();
      const channel = supabase
        .channel("dispatch-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchBoard())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => fetchBoard())
        .subscribe();
      unsub = () => supabase.removeChannel(channel);
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [fetchBoard]);

  async function assign(orderId: string, riderId?: string) {
    setBusyOrderId(orderId);
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, ...(riderId ? { rider_id: riderId } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      setManualFor(null);
      await fetchBoard();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Could not assign",
        text: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusyOrderId(null);
    }
  }

  async function revoke(orderId: string, orderNumber: string) {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Revoke assignment?",
      text: `Remove the rider from order #${orderNumber}? The order returns to the unassigned queue.`,
      showCancelButton: true,
      confirmButtonText: "Revoke",
      cancelButtonText: "Keep",
    });
    if (!confirm.isConfirmed) return;

    setBusyOrderId(orderId);
    try {
      const res = await fetch("/api/dispatch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revoke failed");
      await fetchBoard();
    } catch (err: unknown) {
      Swal.fire({
        icon: "error",
        title: "Could not revoke",
        text: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusyOrderId(null);
    }
  }

  if (loading && !board) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-crimson-600" />
      </div>
    );
  }

  const riders = board?.riders || [];
  const unassigned = board?.unassigned || [];
  const awaiting = board?.awaiting || [];
  const log = board?.log || [];
  const maxActive = board?.max_active_deliveries || 2;
  const nextRider = riders.find((r) => r.under_cap);
  const filteredRiders = filter
    ? riders.filter((r) => r.full_name.toLowerCase().includes(filter.toLowerCase()))
    : riders;

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Dispatch</h1>
          <p className="text-sm text-muted-foreground">
            Fair queue: least loaded first, then longest idle. {unassigned.length} order
            {unassigned.length === 1 ? "" : "s"} waiting · {riders.length} rider{riders.length === 1 ? "" : "s"} on duty
          </p>
        </div>
        <button
          onClick={fetchBoard}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <strong>The dispatch board could not be loaded.</strong> {error}
          </div>
        </div>
      )}

      {board && !error && unassigned.length === 0 && awaiting.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> All caught up — no orders need a rider right now.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* ── Left: order queues (2/3) ─────────────────────────── */}
        <div className="xl:col-span-2 space-y-6">
          {/* Awaiting rider response */}
          {awaiting.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Timer className="h-4 w-4 text-amber-500" />
                <h2 className="font-bold text-gray-900">Awaiting rider response</h2>
                <span className="text-xs text-muted-foreground">auto-requeued after 10 min</span>
              </div>
              <div className="divide-y divide-gray-50">
                {awaiting.map((o) => {
                  const age = awaitingAge(o.rider_assigned_at);
                  const riderName = o.rider
                    ? `${o.rider.first_name || ""} ${o.rider.last_name || ""}`.trim() || "Rider"
                    : "Unknown";
                  return (
                    <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          #{o.order_number}
                          <span className="ml-2 font-normal text-gray-500">→ {riderName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">waiting {age.text}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            age.urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {age.urgent ? "requeue soon" : "sent"}
                        </span>
                        <button
                          onClick={() => revoke(o.id, o.order_number)}
                          disabled={busyOrderId === o.id}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Unassigned queue */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bike className="h-4 w-4 text-crimson-600" />
                <h2 className="font-bold text-gray-900">Unassigned orders</h2>
                <span className="text-xs text-muted-foreground">oldest first</span>
              </div>
              {nextRider && unassigned.length > 0 && (
                <span className="text-xs text-gray-500">
                  next up: <span className="font-semibold text-gray-800">{nextRider.full_name}</span>
                </span>
              )}
            </div>

            {unassigned.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">No orders waiting for a rider.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {unassigned.map((o) => {
                  const itemCount = o.item_count?.[0]?.count ?? 0;
                  const age = awaitingAge(o.created_at);
                  return (
                    <div key={o.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">#{o.order_number}</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">
                            {o.status.replace(/_/g, " ")}
                          </span>
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded ${
                              o.payment_method === "cod" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {o.payment_method.toUpperCase()}
                            {o.payment_method === "gcash" && o.payment_status !== "verified" ? " (unverified)" : ""}
                          </span>
                          {o.payment_method === "cod" && o.payment_status !== "verified" && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              payment pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                          {itemCount} item{itemCount === 1 ? "" : "s"} · {formatCurrency(o.total)} · waiting {age.text}{" "}
                          · {o.delivery_address}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => assign(o.id)}
                          disabled={busyOrderId === o.id || !nextRider}
                          title={nextRider ? `Auto-assign to ${nextRider.full_name}` : "No rider under capacity"}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-crimson-600 text-white text-xs font-bold hover:bg-crimson-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {busyOrderId === o.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Zap className="h-3.5 w-3.5" />
                          )}
                          Auto-Assign
                        </button>
                        <button
                          onClick={() => setManualFor(manualFor === o.id ? null : o.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Pick rider
                        </button>
                      </div>

                      {manualFor === o.id && (
                        <div className="w-full border-t border-dashed border-gray-200 pt-3 mt-1">
                          <p className="text-xs text-muted-foreground mb-2">
                            Ranked queue — tap to assign. Riders at capacity are marked{" "}
                            <span className="font-semibold text-amber-600">full</span> and cannot take another order.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {riders.map((r, i) => (
                              <button
                                key={r.id}
                                onClick={() => assign(o.id, r.id)}
                                disabled={busyOrderId === o.id || !r.under_cap}
                                title={
                                  r.under_cap
                                    ? undefined
                                    : `At capacity (${maxActive}) — raise the limit in Admin → Settings`
                                }
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors disabled:opacity-50 ${
                                  r.under_cap
                                    ? "border-gray-200 hover:border-crimson-400 hover:bg-crimson-50 text-gray-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700"
                                }`}
                              >
                                <span className="text-[10px] font-bold text-gray-400">#{i + 1}</span>
                                {r.full_name}
                                <span className="text-[10px] text-gray-400">
                                  {r.active_count}/{maxActive}
                                </span>
                              </button>
                            ))}
                            {riders.length === 0 && (
                              <span className="text-xs text-red-500">No available riders online.</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Dispatch log */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <History className="h-4 w-4 text-gray-400" />
              <h2 className="font-bold text-gray-900">Dispatch log</h2>
              <span className="text-xs text-muted-foreground">last {log.length} events</span>
            </div>
            {log.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">No dispatch activity yet.</div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {log.map((e) => {
                  const meta = actionLabels[e.action] || { label: e.action, cls: "bg-gray-100 text-gray-700" };
                  const riderName = e.r ? `${e.r.first_name || ""} ${e.r.last_name || ""}`.trim() || "Rider" : null;
                  return (
                    <div key={e.id} className="px-5 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${meta.cls}`}>{meta.label}</span>
                        <span className="text-gray-700 font-medium">#{e.order?.order_number || "—"}</span>
                        {riderName && <span className="text-gray-500 truncate">{riderName}</span>}
                      </div>
                      <span className="text-gray-400 shrink-0">{timeAgo(e.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── Right: rider leaderboard (1/3) ───────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-crimson-600" />
              <h2 className="font-bold text-gray-900">Rider queue</h2>
              <span className="text-xs text-muted-foreground">fairness order</span>
            </div>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter riders…"
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-crimson-500"
            />
          </div>

          {filteredRiders.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-amber-400" />
              No riders are available. Riders must be online to receive assignments.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredRiders.map((r) => {
                const queueIndex = riders.findIndex((x) => x.id === r.id);
                return (
                  <div key={r.id} className="px-5 py-3.5 flex items-center gap-3">
                    <span
                      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        queueIndex === 0 && r.under_cap ? "bg-crimson-600 text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {queueIndex + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">{r.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.active_count}/{maxActive} active · last delivery {timeAgo(r.last_delivered_at)}
                      </p>
                      {/* load bar */}
                      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden w-full max-w-[160px]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            r.active_count >= maxActive
                              ? "bg-amber-500"
                              : r.active_count > 0
                                ? "bg-crimson-500"
                                : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(100, (r.active_count / Math.max(1, maxActive)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                        r.under_cap ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.under_cap ? (queueIndex === 0 ? "NEXT" : "READY") : "FULL"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ranking: fewest active deliveries → longest idle. Riders at the cap ({maxActive}) are listed but cannot be
              assigned until they finish a delivery (or the limit is raised in Admin → Settings).
            </p>
          </div>
        </section>
      </div>

      {/* Empty-board hint when orders exist but no riders */}
      {unassigned.length > 0 && riders.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <strong>There are orders but no riders online.</strong> Ask a rider to toggle online, or approve new rider
            applications from the Riders page. <ArrowRight className="inline h-3.5 w-3.5" />
          </div>
        </div>
      )}
    </div>
  );
}
