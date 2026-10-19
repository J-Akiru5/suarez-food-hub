import { createServiceClient } from "@repo/data-access/client";
import { type NextRequest, NextResponse } from "next/server";

const PSGC_BASE_URL = "https://psgc.gitlab.io/api";

interface LocationOption {
  id: string;
  name: string;
}

async function fetchPsgcOptions(path: string): Promise<LocationOption[]> {
  const response = await fetch(`${PSGC_BASE_URL}${path}`);
  if (!response.ok) return [];
  const rawData: unknown = await response.json();
  if (!Array.isArray(rawData)) return [];
  return rawData.map((item: { code: string; name: string }) => ({ id: item.code, name: item.name }));
}

export async function GET(request: NextRequest) {
  try {
    const serviceSupabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const parent = searchParams.get("parent");
    const rider_id = searchParams.get("rider_id");

    if (type) {
      // Iloilo City's districts (Jaro, Molo, ...) are not published by the
      // PSGC API, so they and their barangays are served from the locations
      // table. Every other level/town keeps using the live PSGC API.
      if (type === "district" && parent) {
        const { data, error } = await serviceSupabase
          .from("locations")
          .select("id, name")
          .eq("type", "district")
          .eq("parent_id", parent)
          .order("name");
        // Surface DB failures instead of silently hiding districts — except the
        // pre-migration case (the 'district' enum value does not exist yet),
        // where behaving like a district-less city keeps the old flat flow
        // working until the migration is applied.
        if (error) {
          if (error.code === "22P02") {
            return NextResponse.json({ success: true, data: [] });
          }
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: (data ?? []).map(({ id, name }) => ({ id, name })) });
      }

      if (type === "barangay" && parent) {
        const { data } = await serviceSupabase
          .from("locations")
          .select("id, name")
          .eq("type", "barangay")
          .eq("parent_id", parent)
          .order("name");
        // Cached (seeded) barangays win — e.g. a district or Iloilo City.
        // Towns that are not cached fall back to the live PSGC API so all
        // existing delivery locations keep working.
        if (data && data.length > 0) {
          return NextResponse.json({ success: true, data: data.map(({ id, name }) => ({ id, name })) });
        }
        return NextResponse.json({
          success: true,
          data: await fetchPsgcOptions(`/cities-municipalities/${parent}/barangays`),
        });
      }

      let path = "";
      if (type === "region") {
        path = "/regions";
      } else if (type === "province" && parent) {
        path = `/regions/${parent}/provinces`;
      } else if (type === "city" && parent) {
        path = `/provinces/${parent}/cities-municipalities`;
      }

      if (path) {
        return NextResponse.json({ success: true, data: await fetchPsgcOptions(path) });
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
