import { getUser } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { deleteCart, getCart, upsertCart } from "@repo/data-access/data/cart";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const user = await getUser(authClient);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = createServiceClient();
    const { items, error } = await getCart(serviceSupabase, user.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const user = await getUser(authClient);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { items } = await req.json();
    if (!Array.isArray(items)) return NextResponse.json({ success: false, error: "Items must be an array" }, { status: 400 });

    const serviceSupabase = createServiceClient();
    const { error } = await upsertCart(serviceSupabase, user.id, items);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const user = await getUser(authClient);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = createServiceClient();
    const { error } = await deleteCart(serviceSupabase, user.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
