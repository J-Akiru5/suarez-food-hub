import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { rider_id, lat, lng, order_id } = body;

  if (!rider_id || !lat || !lng) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await supabase.from("rider_locations").upsert(
    {
      rider_id,
      latitude: lat,
      longitude: lng,
      order_id: order_id || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rider_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const rider_id = searchParams.get("rider_id");

  if (!rider_id) {
    return NextResponse.json({ error: "rider_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rider_locations")
    .select("*")
    .eq("rider_id", rider_id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
