import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

// Customers upload their GCash payment screenshot (proof) here. Stored in the
// `payment_proofs` bucket (migration 0020) under their own user-id folder.
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authClient = createAuthClient(cookieStore);
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const serviceSupabase = createServiceClient();
    const { error: uploadError } = await serviceSupabase.storage
      .from("payment_proofs")
      .upload(filename, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json({ success: false, error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = serviceSupabase.storage.from("payment_proofs").getPublicUrl(filename);
    return NextResponse.json({ success: true, data: { url: urlData.publicUrl } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
