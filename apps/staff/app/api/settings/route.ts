import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { getBusinessConfig, updateBusinessConfig } from "@repo/data-access/data/business";
import { getProfileRole } from "@repo/data-access/data/profiles";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Sanity cap for the delivery minimum (PHP pesos).
const MAX_MIN_ORDER_AMOUNT = 100000;

// PATCH: staff-editable store settings. Currently only the delivery minimum order amount.
// The proxy skips /api/*, so this route authenticates itself before touching the service client.
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const profile = await getProfileRole(supabase, user.id);

    if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (profile.is_active === false) {
      return NextResponse.json({ success: false, error: "Account inactive" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("delivery_min_order_amount" in body)) {
      return NextResponse.json({ success: false, error: "delivery_min_order_amount is required" }, { status: 400 });
    }

    // null / empty string = no minimum; otherwise a whole peso amount within range.
    const raw = (body as { delivery_min_order_amount: unknown }).delivery_min_order_amount;
    let amount: number | null;
    if (raw === null || raw === "") {
      amount = null;
    } else if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= MAX_MIN_ORDER_AMOUNT) {
      amount = raw;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum order amount must be a whole number between 0 and ${MAX_MIN_ORDER_AMOUNT}, or empty for no minimum`,
        },
        { status: 400 },
      );
    }

    const serviceSupabase = createServiceClient();
    const config = await getBusinessConfig(serviceSupabase);
    if (!config) return NextResponse.json({ success: false, error: "Business config not found" }, { status: 500 });

    const { data, error } = await updateBusinessConfig(serviceSupabase, config.id, {
      delivery_min_order_amount: amount,
    });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      data: { delivery_min_order_amount: data?.delivery_min_order_amount ?? null },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
