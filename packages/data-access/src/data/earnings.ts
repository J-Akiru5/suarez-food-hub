import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";

type CashoutUpdate = Database["public"]["Tables"]["rider_cashouts"]["Update"];

export async function getRiderEarnings(supabase: TypedSupabaseClient, riderId: string) {
  const { data } = await supabase
    .from("rider_earnings")
    .select("*, order:orders!rider_earnings_order_id_fkey(order_number, total, delivery_address, delivered_at)")
    .eq("rider_id", riderId)
    .order("earned_at", { ascending: false });
  return data || [];
}

export async function getTodayEarnings(supabase: TypedSupabaseClient, riderId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("rider_earnings")
    .select("amount")
    .eq("rider_id", riderId)
    .gte("earned_at", today.toISOString());
  return data || [];
}

export async function createRiderEarning(
  supabase: TypedSupabaseClient,
  riderId: string,
  orderId: string,
  amount: number,
) {
  // Explicitly provide id since Prisma's @default(uuid()) doesn't set DB-level DEFAULT
  const { error } = await supabase.from("rider_earnings").insert({
    id: crypto.randomUUID(),
    rider_id: riderId,
    order_id: orderId,
    amount,
  });
  return { error };
}

export async function getCashouts(supabase: TypedSupabaseClient) {
  const { data } = await supabase
    .from("rider_cashouts")
    .select("*, rider:profiles!rider_cashouts_rider_id_fkey(first_name, last_name, phone)")
    .order("requested_at", { ascending: false });
  return data || [];
}

export async function updateCashout(supabase: TypedSupabaseClient, cashoutId: string, updates: CashoutUpdate) {
  const { error } = await supabase.from("rider_cashouts").update(updates).eq("id", cashoutId);
  return { error };
}

// Requests a cashout through the server-side RPC (0022), which enforces the
// ₱50 minimum and the available balance inside the database (race-safe).
// The RPC snapshots the rider's profile GCash number automatically.
// error.message carries the DB validation text (e.g. "Amount exceeds
// available balance (₱123)") for direct display to the rider.
export async function requestCashout(supabase: TypedSupabaseClient, amount: number) {
  const { data, error } = await (supabase as any).rpc("request_rider_cashout", { p_amount: amount });
  return { data, error };
}
