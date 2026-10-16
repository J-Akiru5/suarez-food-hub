/**
 * Fair-dispatch queueing — the pure core of the staff Dispatch board.
 *
 * Kept free of any Supabase/React imports so it can be unit tested directly
 * (packages/utils/src/__tests__/dispatch.test.ts) and reused by:
 *   - packages/data-access/src/data/dispatch.ts  (staff board ranking + auto-assign)
 *   - supabase/migrations/0030_dispatch_queue.sql (dispatch_pick_next — mirrors this
 *     ordering, so the DB cascade and the visible queue can never disagree)
 *
 * Fairness rules (in order):
 *   1. fewer active deliveries wins  (active = awaiting + claimed + out + near)
 *   2. tie → longest time since last completed delivery (never delivered = longest)
 *   3. riders at the concurrency cap are demoted below every under-cap rider,
 *      but stay listed so staff can still assign them manually
 */

/** Statuses that count toward a rider's active load. */
export const ACTIVE_DELIVERY_STATUSES = [
  "awaiting_rider",
  "claimed_by_rider",
  "out_for_delivery",
  "near_customer",
] as const;

/** Order statuses the dispatch board may assign a rider to. */
export const DISPATCHABLE_STATUSES = ["confirmed", "preparing", "ready_for_pickup"] as const;

/** Minutes a rider has to accept before the assignment is re-queued. */
export const ASSIGNMENT_TIMEOUT_MIN = 10;

/** Max cascade hops when riders keep declining the same order. */
export const MAX_CASCADE_ATTEMPTS = 5;

/** Server default when business.max_active_deliveries is missing. */
export const DEFAULT_MAX_ACTIVE_DELIVERIES = 2;

export interface DispatchRiderCandidate {
  id: string;
  /** Number of orders currently in ACTIVE_DELIVERY_STATUSES. */
  active_count: number;
  /** ISO timestamp of the rider's last completed delivery, or null if never. */
  last_delivered_at?: string | null;
}

export interface RankedDispatchRider extends DispatchRiderCandidate {
  /** false when active_count >= cap — skipped by Auto-Assign, still pickable manually. */
  under_cap: boolean;
  /** Milliseconds since last delivery; Number.MAX_SAFE_INTEGER when never delivered. */
  idle_ms: number;
}

/**
 * Sort candidates into the fair dispatch order and flag capacity.
 *
 * `now` is injectable so tests are deterministic.
 */
export function rankDispatchRiders<T extends DispatchRiderCandidate>(
  candidates: T[],
  maxActiveDeliveries: number,
  now: Date = new Date(),
): (T & { under_cap: boolean; idle_ms: number })[] {
  const cap =
    Number.isFinite(maxActiveDeliveries) && maxActiveDeliveries > 0
      ? maxActiveDeliveries
      : DEFAULT_MAX_ACTIVE_DELIVERIES;
  const nowMs = now.getTime();

  return candidates
    .map((c) => {
      const lastMs = c.last_delivered_at ? new Date(c.last_delivered_at).getTime() : Number.NaN;
      const idleMs = Number.isFinite(lastMs) ? Math.max(0, nowMs - lastMs) : Number.MAX_SAFE_INTEGER;
      return { ...c, under_cap: c.active_count < cap, idle_ms: idleMs };
    })
    .sort((a, b) => {
      // 1. capacity first: under-cap riders always precede over-cap riders
      const capDiff = Number(b.under_cap) - Number(a.under_cap);
      if (capDiff !== 0) return capDiff;
      // 2. least loaded
      if (a.active_count !== b.active_count) return a.active_count - b.active_count;
      // 3. longest idle (Infinity = never delivered sorts first)
      if (a.idle_ms !== b.idle_ms) return b.idle_ms - a.idle_ms;
      // 4. stable, deterministic tiebreak so two equal riders don't flicker
      return a.id.localeCompare(b.id);
    });
}

/**
 * Pick the rider Auto-Assign should use: first under-cap rider in fair order.
 * Returns null when every eligible rider is at capacity.
 */
export function pickAutoAssignRider<T extends DispatchRiderCandidate>(
  candidates: T[],
  maxActiveDeliveries: number,
  now: Date = new Date(),
): (T & { under_cap: boolean; idle_ms: number }) | null {
  return rankDispatchRiders(candidates, maxActiveDeliveries, now).find((r) => r.under_cap) ?? null;
}

/**
 * Validate an admin-entered concurrency cap. Returns a clamped integer >= 1.
 */
export function normalizeMaxActiveDeliveries(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_MAX_ACTIVE_DELIVERIES;
  // Hard ceiling keeps a typo (e.g. 9999) from disabling queue fairness.
  return Math.min(n, 20);
}
