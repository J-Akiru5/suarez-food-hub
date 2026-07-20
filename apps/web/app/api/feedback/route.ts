import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message, page_url } = body;

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: "Message is required" }, { status: 400 });
    }

    // Try to get the authenticated user
    const cookieStore = await cookies();
    const authSupabase = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    const supabase = createServiceClient();
    const { error } = await supabase.from("feedback").insert({
      user_id: user?.id || null,
      name: name?.trim() || "",
      email: email?.trim() || "",
      message: message.trim(),
      page_url: page_url || null,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authSupabase = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const supabase = createServiceClient();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
