import { getUser } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { getOrdersByUser } from "@repo/data-access/data/orders";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const serviceSupabase = createServiceClient();
    const { userId } = await params;
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);

    const user = await getUser(authClient);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orders = await getOrdersByUser(serviceSupabase, userId);
    return NextResponse.json(orders);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
