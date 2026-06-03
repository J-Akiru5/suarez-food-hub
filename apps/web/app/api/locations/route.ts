import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const parent = searchParams.get("parent");
    const rider_id = searchParams.get("rider_id");

    // PSGC query (used by profile page for cascading address select)
    if (type) {
      let query = supabase.from("locations").select("*").eq("type", type).order("name");
      if (parent) query = query.eq("parent_id", parent);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data || []);
    }

    // Rider location query (used by customer map)
    if (rider_id) {
      const { data, error } = await supabase
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
