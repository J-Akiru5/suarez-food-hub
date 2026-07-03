import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    const response = await fetch(`${url}/rest/v1/profiles?select=email&username=eq.${encodeURIComponent(username)}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Lookup failed" }, { status: response.status });
    }

    const data = await response.json();

    if (!data || data.length === 0 || !data[0].email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ email: data[0].email });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
