import { getUser, requireAdmin } from "@repo/data-access/auth";
import { createServiceClient } from "@repo/data-access/client";
import { getBusinessConfig } from "@repo/data-access/data/business";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const config = await getBusinessConfig(supabase);
    if (!config) return NextResponse.json({ success: false, error: "Business config not found" }, { status: 500 });
    return NextResponse.json({ success: true, data: config });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll() {},
        },
      },
    );
    const user = await getUser(authSupabase);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const isAdmin = await requireAdmin(supabase, user.id);
    if (!isAdmin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const qrcodeFile = formData.get("gcash_qr") as File | null;
    if (!qrcodeFile || qrcodeFile.size === 0) return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });

    const ext = qrcodeFile.name.split(".").pop();
    const filename = `gcash_qr_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("business_qr")
      .upload(filename, qrcodeFile, { contentType: qrcodeFile.type, upsert: true });
    if (uploadError)
      return NextResponse.json({ success: false, error: `Image upload failed: ${uploadError.message}` }, { status: 500 });

    const { data: urlData } = supabase.storage.from("business_qr").getPublicUrl(filename);

    const config = await getBusinessConfig(supabase);
    if (!config) return NextResponse.json({ success: false, error: "Business config not found" }, { status: 500 });

    const { error: dbError } = await supabase
      .from("business")
      .update({ gcash_qr_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", config.id);
    if (dbError) return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });

    return NextResponse.json({ success: true, data: { url: urlData.publicUrl } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
