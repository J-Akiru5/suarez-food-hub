import { createServiceClient } from "@repo/data-access/client";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ riderId: string }> }) {
  try {
    const { riderId } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase.from("rider_reviews").select("rating").eq("rider_id", riderId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const reviews = data || [];
    const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        average_rating: Math.round(averageRating * 10) / 10,
        total_reviews: reviews.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
