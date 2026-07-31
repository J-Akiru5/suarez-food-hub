import { getUser, requireAdmin } from "@repo/data-access/auth";
import { createServiceClient } from "@repo/data-access/client";
import { getBusinessConfig, updateBusinessConfig } from "@repo/data-access/data/business";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const config = await getBusinessConfig(supabase);
    if (!config) return NextResponse.json({ success: false, error: "Business config not found" }, { status: 500 });
    return NextResponse.json({ success: true, data: config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT: Update business settings (admin settings page) — service client bypasses RLS
export async function PUT(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll() {},
        },
      },
    );
    const user = await getUser(authSupabase);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const isAdmin = await requireAdmin(supabase, user.id);
    if (!isAdmin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      // No config exists yet — create one
      const { data: newConfig, error: createError } = await supabase
        .from("business")
        .insert({ id: crypto.randomUUID(), ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (createError) return NextResponse.json({ success: false, error: createError.message }, { status: 500 });
      return NextResponse.json({ success: true, data: newConfig });
    }

    const { data, error } = await updateBusinessConfig(supabase, id, updates);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
