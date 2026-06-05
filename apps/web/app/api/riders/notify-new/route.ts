import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: NextRequest) {
  try {
    const serviceSupabase = getServiceSupabase();
    const { rider_id, rider_name } = await req.json();

    if (!rider_id || !rider_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: admins, error: adminsError } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (adminsError) return NextResponse.json({ error: adminsError.message }, { status: 500 });
    if (!admins || admins.length === 0) return NextResponse.json({ success: true, notified: 0 });

    const { error: notifError } = await serviceSupabase.from("notifications").insert(
      admins.map((admin) => ({
        user_id: admin.id,
        type: "rider_application",
        title: "New Rider Application",
        message: `${rider_name} has applied to be a rider. Review and approve/decline in the admin panel.`,
        data: { rider_id },
      })),
    );

    if (notifError) return NextResponse.json({ error: notifError.message }, { status: 500 });
    return NextResponse.json({ success: true, notified: admins.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
