"use server";

export async function lookupUsername(username: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  const response = await fetch(`${url}/rest/v1/profiles?select=email&username=eq.${encodeURIComponent(username)}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data || data.length === 0 || !data[0].email) return null;

  return data[0].email;
}
