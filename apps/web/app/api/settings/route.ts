import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function requireAdmin() {
  const supabase = getServiceSupabase();
  const authSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const settings = data.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceSupabase();
    const formData = await req.formData();
    const qrcodeFile = formData.get("gcash_qr") as File | null;
    if (!qrcodeFile || qrcodeFile.size === 0) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const ext = qrcodeFile.name.split(".").pop();
    const filename = `gcash_qr_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("admin-settings")
      .upload(filename, qrcodeFile, { contentType: qrcodeFile.type, upsert: true });
    if (uploadError)
      return NextResponse.json({ error: "Image upload failed: " + uploadError.message }, { status: 500 });

    const { data: urlData } = supabase.storage.from("admin-settings").getPublicUrl(filename);
    const { error: dbError } = await supabase
      .from("settings")
      .upsert({ key: "gcash_qr_url", value: urlData.publicUrl, updated_at: new Date().toISOString() });
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
