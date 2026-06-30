import { createServiceClient } from "@repo/data-access/client";
import { upsertRiderLocation } from "@repo/data-access/data/locations";
import { type NextRequest, NextResponse } from "next/server";

async function requireRider(supabase: ReturnType<typeof createServiceClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "rider") return null;
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const rider = await requireRider(supabase);
    if (!rider) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { rider_id, lat, lng, order_id } = body;

    if (!rider_id || !lat || !lng) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await upsertRiderLocation(supabase, rider_id, lat, lng, order_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const rider = await requireRider(supabase);
    if (!rider) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rider_id = searchParams.get("rider_id");
    if (!rider_id) return NextResponse.json({ error: "rider_id required" }, { status: 400 });

    const { data, error } = await supabase.from("rider_locations").select("*").eq("rider_id", rider_id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
