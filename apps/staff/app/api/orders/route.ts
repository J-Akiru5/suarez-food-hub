import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();

    if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (profile.is_active === false) {
      return NextResponse.json({ error: "Account inactive" }, { status: 403 });
    }

    const body = await request.json();
    const { order_id, status } = body;

    if (!order_id || !status) {
      return NextResponse.json({ error: "order_id and status required" }, { status: 400 });
    }

    const allowedStatuses = ["confirmed", "preparing", "ready_for_pickup"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Staff cannot set this status" }, { status: 403 });
    }

    const timestampPatch: Record<string, string> = {};
    if (status === "confirmed") timestampPatch.confirmed_at = new Date().toISOString();
    if (status === "preparing") timestampPatch.prepared_at = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update({ status, ...timestampPatch, staff_id: user.id })
      .eq("id", order_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase.from("order_status_log").insert({
      order_id,
      status,
      changed_by: user.id,
      notes: `Set by ${profile.role}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
