import type { Database } from "@repo/data-access";
import { createServiceClient } from "@repo/data-access/client";
import { getLocations } from "@repo/data-access/data/locations";
import { type NextRequest, NextResponse } from "next/server";

type LocationType = Database["public"]["Enums"]["location_type"];

export async function GET(request: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const parent = searchParams.get("parent");
    const rider_id = searchParams.get("rider_id");

    if (type) {
      const data = await getLocations(serviceSupabase, type as LocationType, parent || undefined);
      return NextResponse.json(data);
    }

    if (rider_id) {
      const { data, error } = await serviceSupabase
        .from("rider_locations")
        .select("*")
        .eq("rider_id", rider_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data || {});
    }

    return NextResponse.json({ error: "Provide type or rider_id" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
