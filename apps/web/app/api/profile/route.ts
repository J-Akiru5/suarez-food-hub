import { getUser } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { getProfileById, updateProfile } from "@repo/data-access/data/profiles";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const user = await getUser(authClient);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const serviceSupabase = createServiceClient();
    const profile = await getProfileById(serviceSupabase, user.id);
    if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 500 });
    return NextResponse.json({ success: true, data: profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, profile_data } = body;

    if (!user_id || !profile_data) {
      return NextResponse.json({ success: false, error: "Missing user_id or profile_data" }, { status: 400 });
    }

    // Use service role client to bypass RLS — needed because after signUp the
    // auth session may not be fully established (e.g. email confirmation enabled),
    // which would cause RLS policy (auth.uid() = id) to reject the insert.
    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from("profiles")
      .upsert({ id: user_id, ...profile_data })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

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

    const body = await req.json();
    const {
      first_name,
      last_name,
      full_name,
      phone,
      street_address,
      region_id,
      province_id,
      town_id,
      barangay_id,
      zip_code,
      address,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (street_address !== undefined) updateData.street_address = street_address;
    if (region_id !== undefined) updateData.region_id = region_id;
    if (province_id !== undefined) updateData.province_id = province_id;
    if (town_id !== undefined) updateData.town_id = town_id;
    if (barangay_id !== undefined) updateData.barangay_id = barangay_id;
    if (zip_code !== undefined) updateData.zip_code = zip_code;
    if (address !== undefined) updateData.address = address;

    const serviceSupabase = createServiceClient();
    const { data, error } = await updateProfile(serviceSupabase, user.id, updateData);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
