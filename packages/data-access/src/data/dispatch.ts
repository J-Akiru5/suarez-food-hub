import { ACTIVE_DELIVERY_STATUSES, DISPATCHABLE_STATUSES, rankDispatchRiders } from "@repo/utils";
import type { TypedSupabaseClient } from "../client";

/**
 * Fair-dispatch helpers for the staff Dispatch board.
 *
 * The fairness ordering itself lives in @repo/utils (rankDispatchRiders) so it
 * is unit tested and shared; migration 0030's dispatch_pick_next() mirrors the
 * same ordering for the DB-side cascade.
 *
 * The DB-side RPC is the authority for actual assignment (race-safe under an
 * advisory lock); this module only powers the staff board's ranking display
 * and the auto-assign suggestion.
 */

export { ACTIVE_DELIVERY_STATUSES, DISPATCHABLE_STATUSES };

export interface RankedRider {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  rider_status: string | null;
  active_count: number;
  last_delivered_at: string | null;
  under_cap: boolean;
  /** minutes since last delivery, Infinity when never delivered */
  idle_minutes: number;
}

export interface DispatchBoardData {
  riders: RankedRider[];
  unassigned: unknown[];
  awaiting: unknown[];
  log: unknown[];
  max_active_deliveries: number;
}

export interface AssignResult {
  success: boolean;
  error?: string;
  rider_id?: string;
  action?: string;
}

/**
 * Rank every eligible rider for the dispatch board.
 * Returned riders are ALWAYS listed (including over-cap ones, flagged) so
 * staff can still manually assign a rider who is "full".
 */
export async function getRankedRiders(supabase: TypedSupabaseClient, maxActive: number): Promise<RankedRider[]> {
  const { data: riders, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, full_name, phone, rider_status")
    .eq("role", "rider")
    .eq("is_active", true)
    .in("rider_status", ["available", "vacant"]);
  if (error || !riders?.length) return [];

  const { data: activeOrders } = await supabase
    .from("orders")
    .select("rider_id")
    .in("status", ACTIVE_DELIVERY_STATUSES as unknown as string[])
    .not("rider_id", "is", null);

  const { data: recentDeliveries } = await supabase
    .from("orders")
    .select("rider_id, delivered_at")
    .not("delivered_at", "is", null)
    .order("delivered_at", { ascending: false })
    .limit(500);

  const activeByRider = new Map<string, number>();
  for (const o of activeOrders || []) {
    const id = o.rider_id as string;
    activeByRider.set(id, (activeByRider.get(id) || 0) + 1);
  }

  const lastDeliveryByRider = new Map<string, string>();
  for (const o of recentDeliveries || []) {
    const id = o.rider_id as string;
    if (!lastDeliveryByRider.has(id)) lastDeliveryByRider.set(id, o.delivered_at as string);
  }

  const candidates = riders.map((r) => ({
    id: r.id,
    full_name: r.full_name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || "Rider",
    first_name: r.first_name,
    last_name: r.last_name,
    phone: r.phone,
    rider_status: r.rider_status,
    active_count: activeByRider.get(r.id) || 0,
    last_delivered_at: lastDeliveryByRider.get(r.id) || null,
  }));

  // Fair order: least loaded → longest idle; over-cap riders sink below
  // under-cap riders but stay listed (staff may still assign them manually).
  const ranked: RankedRider[] = rankDispatchRiders(candidates, maxActive).map((r) => ({
    ...r,
    idle_minutes: r.idle_ms === Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : Math.floor(r.idle_ms / 60000),
  }));

  return ranked;
}

/** Staff-triggered assignment. `riderId` omitted → server picks the top-ranked under-cap rider. */
export async function assignRider(
  supabase: TypedSupabaseClient,
  args: { orderId: string; riderId?: string; actorId: string },
): Promise<AssignResult> {
  const { orderId, riderId, actorId } = args;

  if (!riderId) {
    // Auto-assign: pick the fairest rider right now. The RPC re-validates
    // eligibility + cap under its advisory lock, so a stale suggestion can
    // never over-assign — it just raises and we surface that to staff.
    const { data: biz } = await supabase.from("business").select("max_active_deliveries").limit(1).maybeSingle();
    const maxActive = Number(biz?.max_active_deliveries) || 2;
    const ranked = await getRankedRiders(supabase, maxActive);
    const next = ranked.find((r) => r.under_cap);
    if (!next) {
      return { success: false, error: "No eligible riders — every rider is at capacity or offline." };
    }
    return assignRider(supabase, { orderId, riderId: next.id, actorId });
  }

  const { data, error } = await supabase.rpc("assign_rider", {
    p_order_id: orderId,
    p_rider_id: riderId,
    p_assigned_by: actorId,
  });
  if (error) return { success: false, error: error.message };
  const payload = data as { success?: boolean; rider_id?: string; error?: string };
  if (!payload?.success) return { success: false, error: payload?.error || "Assignment failed" };
  return { success: true, rider_id: payload.rider_id };
}

/** Staff override: detach the current rider (and un-wait the order). */
export async function revokeAssignment(
  supabase: TypedSupabaseClient,
  args: { orderId: string; actorId: string },
): Promise<AssignResult> {
  const { data, error } = await supabase.rpc("revoke_assignment", {
    p_order_id: args.orderId,
    p_actor: args.actorId,
  });
  if (error) return { success: false, error: error.message };
  const payload = data as { success?: boolean; rider_id?: string };
  if (!payload?.success) return { success: false, error: "Revoke failed" };
  return { success: true, rider_id: payload.rider_id };
}

/**
 * Sweep assignments the rider never answered (10 min). Lazy — called whenever
 * the dispatch board loads or an assign runs, so no cron is required.
 */
export async function requeueStaleAssignments(supabase: TypedSupabaseClient): Promise<void> {
  await supabase.rpc("requeue_stale_assignments");
}
