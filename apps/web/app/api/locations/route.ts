import type { Database } from "@repo/data-access";
import { createServiceClient } from "@repo/data-access/client";
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
      const baseUrl = "https://psgc.gitlab.io/api";
      let url = "";

      if (type === "region") {
        url = `${baseUrl}/regions`;
      } else if (type === "province" && parent) {
        url = `${baseUrl}/regions/${parent}/provinces`;
      } else if (type === "city" && parent) {
        url = `${baseUrl}/provinces/${parent}/cities-municipalities`;
      } else if (type === "barangay" && parent) {
        url = `${baseUrl}/cities-municipalities/${parent}/barangays`;
      }

      if (url) {
        const response = await fetch(url);
        if (response.ok) {
          const rawData = await response.json();
          const mappedData = rawData.map((item: any) => ({
            id: item.code,
            name: item.name,
          }));
          return NextResponse.json({ success: true, data: mappedData });
        }
      }
      return NextResponse.json({ success: true, data: [] });
    }

    if (rider_id) {
      const { data, error } = await serviceSupabase
        .from("rider_locations")
        .select("*")
        .eq("rider_id", rider_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, data: data || {} });
    }

    return NextResponse.json({ success: false, error: "Provide type or rider_id" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
