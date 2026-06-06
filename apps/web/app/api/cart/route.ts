import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { getUser } from "@repo/data-access/auth";
import { getCart, upsertCart, deleteCart } from "@repo/data-access/data/cart";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const user = await getUser(authClient);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = createServiceClient();
    const { items, error } = await getCart(serviceSupabase, user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const user = await getUser(authClient);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { items } = await req.json();
    if (!Array.isArray(items)) return NextResponse.json({ error: "Items must be an array" }, { status: 400 });

    const serviceSupabase = createServiceClient();
    const { error } = await upsertCart(serviceSupabase, user.id, items);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const user = await getUser(authClient);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = createServiceClient();
    const { error } = await deleteCart(serviceSupabase, user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
