import { getUser, requireAdmin } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { getBusinessConfig, updateBusinessConfig } from "@repo/data-access/data/business";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const serviceSupabase = createServiceClient();
    const data = await getBusinessConfig(serviceSupabase);
    if (!data) return NextResponse.json({ success: false, error: "Business config not found" }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const user = await getUser(authClient);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = createServiceClient();
    const isAdmin = await requireAdmin(serviceSupabase, user.id);
    if (!isAdmin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const config = await getBusinessConfig(serviceSupabase);
    if (!config) return NextResponse.json({ success: false, error: "Business config not found" }, { status: 500 });

    const body = await req.json();
    const allowedFields = [
      "name",
      "address",
      "phone",
      "email",
      "logo_url",
      "registration_no",
      "gcash_qr_url",

      "delivery_fee",
      "free_delivery_min",
      "delivery_provinces",
      "base_lat",
      "base_lng",
    ];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    const { data, error } = await updateBusinessConfig(serviceSupabase, config.id, updateData);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
