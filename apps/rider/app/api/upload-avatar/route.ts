import { createServiceClient } from "@repo/data-access/client";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

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

    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify rider role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    if (!profile || profile.role !== "rider") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const prefix = (formData.get("prefix") as string) || `avatar-${user.id}`;

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop();
    const filename = `${prefix}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("business_qr")
      .upload(filename, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json({ success: false, error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("business_qr").getPublicUrl(filename);

    return NextResponse.json({ success: true, data: { url: urlData.publicUrl } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
