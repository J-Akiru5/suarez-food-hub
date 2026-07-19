"use server";

import { createServiceClient } from "@repo/data-access/client";

export async function lookupUsername(username: string): Promise<string | null> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("username", username)
    .maybeSingle();

  if (!data?.email) return null;
  return data.email;
}
