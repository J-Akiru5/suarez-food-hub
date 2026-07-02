import { getUser, requireAdmin } from "@repo/data-access/auth";
import { createServiceClient } from "@repo/data-access/client";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    // Use the request cookies to authenticate (so the user session is available)
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await requireAdmin(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const prefix = (formData.get("prefix") as string) || "qr";

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop();
    const filename = `${prefix}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("business_qr")
      .upload(filename, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: "Image upload failed: " + uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("business_qr").getPublicUrl(filename);

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
