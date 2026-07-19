import { createServiceClient } from "@repo/data-access/client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from("business_config").select("base_lat, base_lng").limit(1).maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        base_lat: Number(data?.base_lat) || 10.9501875,
        base_lng: Number(data?.base_lng) || 122.5065625,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
