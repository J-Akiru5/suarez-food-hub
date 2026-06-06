import { type NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { getUser, requireAdmin } from "@repo/data-access/auth";

export async function GET() {
  try {
    const supabase = createServiceClient();
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
    const supabase = createServiceClient();
    const authSupabase = createAuthClient({ getAll: () => [], setAll: () => {} });
    const user = await getUser(authSupabase);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = await requireAdmin(supabase, user.id);
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
