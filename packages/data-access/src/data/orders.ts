import type { TypedSupabaseClient } from "../client";
import type { Database } from "../types";

type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];
type OrderItemInsert = Database["public"]["Tables"]["order_items"]["Insert"];
type OrderStatus = Database["public"]["Enums"]["order_status"];
type OrderStatusLogInsert = Database["public"]["Tables"]["order_status_log"]["Insert"];

export interface CreateOrderInput
  extends Omit<OrderInsert, "id" | "order_number" | "status" | "rider_earnings" | "created_at" | "updated_at"> {}

export interface CreateOrderItemInput extends Omit<OrderItemInsert, "id"> {}

export async function createOrder(supabase: TypedSupabaseClient, order: CreateOrderInput) {
  const now = new Date().toISOString();
  const insertPayload = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...order } as OrderInsert;
  const { data, error } = await supabase.from("orders").insert([insertPayload]).select().single();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function createOrderItems(supabase: TypedSupabaseClient, items: CreateOrderItemInput[]) {
  const insertPayload = items.map((item) => ({ id: crypto.randomUUID(), ...item })) as OrderItemInsert[];
  const { error } = await supabase.from("order_items").insert(insertPayload);
  return { error };
}

export async function deleteOrder(supabase: TypedSupabaseClient, orderId: string) {
  await supabase.from("order_items").delete().eq("order_id", orderId);
  await supabase.from("orders").delete().eq("id", orderId);
}

export async function getOrdersByUser(supabase: TypedSupabaseClient, userId: string, status?: OrderStatus) {
  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getOrdersWithProfiles(
  supabase: TypedSupabaseClient,
  options?: { status?: string; ascending?: boolean },
) {
  let query = supabase
    .from("orders")
    .select(
      "*, profile:profiles!orders_user_id_fkey(first_name, last_name, phone, address), rider:profiles!orders_rider_id_fkey(first_name, last_name), items:order_items(quantity, unit_price, product:products!order_items_product_id_fkey(name))",
    )
    .order("created_at", { ascending: options?.ascending ?? false });
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status as OrderStatus);
  }
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getOrderById(supabase: TypedSupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, profile:profiles!orders_user_id_fkey(*), rider:profiles!orders_rider_id_fkey(*), items:order_items(*, product:products!order_items_product_id_fkey(name, image_url))",
    )
    .eq("id", orderId)
    .single();
  if (error) return null;
  return data;
}

export async function updateOrderStatus(
  supabase: TypedSupabaseClient,
  orderId: string,
  status: OrderStatus,
  extraFields?: OrderUpdate,
) {
  const updates: OrderUpdate = { status, ...extraFields };
  const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
  return { error };
}

export async function getActiveOrderForRider(supabase: TypedSupabaseClient, riderId: string) {
  const { data } = await supabase
    .from("orders")
    .select("*, customer:profiles!orders_user_id_fkey(first_name, last_name, phone)")
    .eq("rider_id", riderId)
    // Orders the rider can act on — includes ready_for_pickup so dashboard shows accept button
    .in("status", ["ready_for_pickup", "claimed_by_rider", "out_for_delivery", "near_customer"] as OrderStatus[])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getPendingOrdersForRider(supabase: TypedSupabaseClient, riderId: string) {
  const { data } = await supabase
    .from("orders")
    .select("*, customer:profiles!orders_user_id_fkey(first_name, last_name, phone)")
    .eq("rider_id", riderId)
    // Orders being prepared — not yet ready for rider to pick up
    .in("status", ["confirmed", "preparing"] as OrderStatus[])
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getOrdersForRider(supabase: TypedSupabaseClient, riderId: string) {
  const { data } = await supabase
    .from("orders")
    .select("*, customer:profiles!orders_user_id_fkey(first_name, last_name, full_name, phone)")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getOrdersCountForRider(supabase: TypedSupabaseClient, riderId: string, statuses: OrderStatus[]) {
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("rider_id", riderId)
    .in("status", statuses);
  return count || 0;
}

export async function getCompletedOrdersCount(supabase: TypedSupabaseClient, riderId: string) {
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("rider_id", riderId)
    .eq("status", "delivered");
  return count || 0;
}

export async function getOrderItems(supabase: TypedSupabaseClient, orderId: string) {
  const { data } = await supabase
    .from("order_items")
    .select("*, product:products!order_items_product_id_fkey(name)")
    .eq("order_id", orderId);
  return data || [];
}

export async function createOrderStatusLog(
  supabase: TypedSupabaseClient,
  orderId: string,
  status: OrderStatus,
  changedBy: string,
  notes?: string,
) {
  const now = new Date().toISOString();
  const entry: OrderStatusLogInsert = {
    id: crypto.randomUUID(),
    changed_at: now,
    order_id: orderId,
    status,
    changed_by: changedBy,
    notes: notes || null,
  };
  await supabase.from("order_status_log").insert(entry);
}
