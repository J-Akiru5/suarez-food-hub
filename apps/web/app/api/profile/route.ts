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

// Only these roles may be self-registered. Admin/staff are created by an admin,
// so a public endpoint must never be able to grant them.
const ALLOWED_SELF_ROLES = ["customer", "rider"] as const;

// Fields a caller is allowed to set when creating their own profile.
const ALLOWED_PROFILE_FIELDS = [
  "email",
  "first_name",
  "last_name",
  "username",
  "full_name",
  "phone",
  "role",
  "is_active",
  "created_at",
  "updated_at",
  "rider_status",
  "vehicle_type",
  "plate_number",
  "license_number",
  "valid_id_url",
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, profile_data } = body;

    if (!user_id || !profile_data || typeof profile_data !== "object") {
      return NextResponse.json({ success: false, error: "Missing user_id or profile_data" }, { status: 400 });
    }

    // If a session exists, the caller may only create their OWN profile.
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (user && user.id !== user_id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Sanitize to allowed fields so callers can't inject role escalation or
    // arbitrary columns (e.g. role: "admin").
    const sanitized: Record<string, unknown> = { id: user_id };
    for (const key of ALLOWED_PROFILE_FIELDS) {
      if ((profile_data as Record<string, unknown>)[key] !== undefined) {
        sanitized[key] = (profile_data as Record<string, unknown>)[key];
      }
    }

    // Enforce the role whitelist — self-registration can never be admin/staff.
    // A missing role defaults to customer so the is_active forcing below always runs.
    const role = sanitized["role"] ?? "customer";
    if (!ALLOWED_SELF_ROLES.includes(role as (typeof ALLOWED_SELF_ROLES)[number])) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }
    sanitized["role"] = role;

    // Force is_active from the role server-side instead of trusting the payload:
    // customers are active immediately, rider applications start inactive until
    // admin approval. A caller can never self-activate a rider profile.
    if (role === "rider") {
      sanitized["is_active"] = false;
      if (!sanitized["rider_status"]) sanitized["rider_status"] = "pending_approval";
    } else if (role === "customer") {
      sanitized["is_active"] = true;
    }

    // Use service role client to bypass RLS — needed because after signUp the
    // auth session may not be fully established (e.g. email confirmation enabled),
    // which would cause RLS policy (auth.uid() = id) to reject the insert.
    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase.from("profiles").upsert(sanitized).select().single();

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
