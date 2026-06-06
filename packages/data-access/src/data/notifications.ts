import type { TypedSupabaseClient } from "../client";
import type { Database, Json } from "../types";

type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

interface NotificationInput {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Json;
}

export async function createNotifications(
  supabase: TypedSupabaseClient,
  notifications: NotificationInput[],
) {
  const { error } = await supabase.from("notifications").insert(notifications as NotificationInsert[]);
  return { error };
}

export async function createNotification(
  supabase: TypedSupabaseClient,
  notification: NotificationInput,
) {
  const { error } = await supabase.from("notifications").insert(notification as NotificationInsert);
  return { error };
}

export async function getNotifications(supabase: TypedSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function markNotificationRead(supabase: TypedSupabaseClient, notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  return { error };
}
