import { createServiceClient } from "@repo/data-access/client";
import { getCategories } from "@repo/data-access/data/categories";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const categories = await getCategories(supabase);
    return NextResponse.json({ success: true, data: categories });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
