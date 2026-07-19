"use server";

export async function lookupUsername(username: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  // Strategy 1: Use the get_email_by_username RPC function (SECURITY DEFINER, bypasses RLS)
  try {
    const rpcResponse = await fetch(`${url}/rest/v1/rpc/get_email_by_username`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_username: username }),
    });

    if (rpcResponse.ok) {
      const email = await rpcResponse.json();
      if (email && typeof email === "string" && email.includes("@")) {
        return email;
      }
    }
  } catch {}

  // Strategy 2: Direct query on profiles table with service role key (bypasses RLS)
  try {
    const response = await fetch(`${url}/rest/v1/profiles?select=email&username=eq.${encodeURIComponent(username)}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0 && data[0].email) {
        return data[0].email;
      }
    }
  } catch {}

  return null;
}
