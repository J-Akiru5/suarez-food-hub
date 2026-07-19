import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { upsertRiderLocation } from "@repo/data-access/data/locations";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

async function requireRider() {
  const cookieStore = await cookies();
  const authClient = createAuthClient(cookieStore);
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;
  const serviceSupabase = createServiceClient();
  const { data: profile } = await serviceSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "rider") return null;
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const rider = await requireRider();
    if (!rider) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { rider_id, lat, lng, order_id } = body;

    if (!rider_id || !lat || !lng) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await upsertRiderLocation(supabase, rider_id, lat, lng, order_id);

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const rider = await requireRider();
    if (!rider) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rider_id = searchParams.get("rider_id");
    if (!rider_id) return NextResponse.json({ success: false, error: "rider_id required" }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase.from("rider_locations").select("*").eq("rider_id", rider_id).single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
