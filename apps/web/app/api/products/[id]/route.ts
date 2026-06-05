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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceSupabase();
    const { id } = await params;
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const price = parseFloat(formData.get("price") as string) || 0;
    const price_medium = parseFloat(formData.get("price_medium") as string) || 0;
    const price_large = parseFloat(formData.get("price_large") as string) || 0;
    const description = formData.get("description") as string;
    const quantity = parseInt(formData.get("quantity") as string) || parseInt(formData.get("stocks") as string) || 0;
    const bufferQuantity = parseInt(formData.get("buffer_quantity") as string) || 5;
    const imageFile = formData.get("image") as File | null;
    let imageUrl = (formData.get("existing_image") as string) || "";

    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.name.split(".").pop();
      const filename = `${Date.now()}_${name.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filename, imageFile, { contentType: imageFile.type, upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(filename);
        imageUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        category,
        price,
        price_medium,
        price_large,
        description,
        image: imageUrl,
        quantity,
        buffer_quantity: bufferQuantity,
        availability: quantity > 0 ? "Available" : "Sold Out",
      })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceSupabase();
    const { id } = await params;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
