import { getUser, requireAdmin } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { deleteProduct, updateProduct } from "@repo/data-access/data/products";
import { type NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServiceClient();
    const authSupabase = createAuthClient({ getAll: () => [], setAll: () => {} });
    const user = await getUser(authSupabase);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = await requireAdmin(supabase, user.id);
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const { data, error } = await updateProduct(supabase, id, {
      name,
      category_id: category,
      base_price: price,
      description,
      image_url: imageUrl,
      quantity,
      buffer_quantity: bufferQuantity,
      availability: quantity > 0 ? "available" : "sold_out",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServiceClient();
    const authSupabase = createAuthClient({ getAll: () => [], setAll: () => {} });
    const user = await getUser(authSupabase);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = await requireAdmin(supabase, user.id);
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { error } = await deleteProduct(supabase, id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
