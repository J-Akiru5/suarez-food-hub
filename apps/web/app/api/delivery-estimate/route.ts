import { createServiceClient } from "@repo/data-access/client";
import { isValidCoordinates } from "@repo/utils";
import { type NextRequest, NextResponse } from "next/server";
import { resolveDeliveryFee } from "../../../lib/delivery-fee";

/**
 * POST /api/delivery-estimate
 * Live delivery-fee preview for checkout. Body: { lat?, lng?, town_id? }.
 *
 * Uses the exact same resolver as POST /api/orders, so the estimate shown
 * to the customer matches the fee the server will charge. Unauthenticated —
 * it only reads the public business config and PSGC centroids.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { lat, lng, town_id } = body ?? {};

    const hasLat = lat !== undefined && lat !== null;
    const hasLng = lng !== undefined && lng !== null;
    if (hasLat !== hasLng) {
      return NextResponse.json(
        { success: false, error: "Delivery coordinates must include both latitude and longitude." },
        { status: 400 },
      );
    }
    const hasPin = hasLat && hasLng;
    if (hasPin && !isValidCoordinates(lat, lng)) {
      return NextResponse.json({ success: false, error: "Invalid delivery coordinates." }, { status: 400 });
    }
    const townId = typeof town_id === "string" && town_id.trim() ? town_id.trim() : null;

    if (!hasPin && !townId) {
      // No coordinates yet — return the flat-fee fallback so checkout still
      // has a number to show while the customer fills in their address.
      const serviceSupabase = createServiceClient();
      const outcome = await resolveDeliveryFee({ supabase: serviceSupabase });
      return NextResponse.json({
        success: true,
        data: {
          fee: outcome.fee,
          distance_km: null,
          source: outcome.source,
          out_of_range: false,
          max_km: outcome.maxKm,
        },
      });
    }

    const serviceSupabase = createServiceClient();
    const outcome = await resolveDeliveryFee({
      supabase: serviceSupabase,
      pin: hasPin ? { lat: lat as number, lng: lng as number } : null,
      townId,
    });

    return NextResponse.json({
      success: true,
      data: {
        fee: outcome.fee,
        distance_km: outcome.distanceKm,
        source: outcome.source,
        out_of_range: outcome.outOfRange,
        max_km: outcome.maxKm,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
