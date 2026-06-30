import { getUser, requireAdmin } from "@repo/data-access/auth";
import { createAuthClient, createServiceClient } from "@repo/data-access/client";
import { createCategory, getCategories, getCategoryByName } from "@repo/data-access/data/categories";
import { createProduct, getProducts } from "@repo/data-access/data/products";
import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const products = await getProducts(supabase);

    const categories = await getCategories(supabase);
    const categoryMap = new Map<string, string>();
    for (const cat of categories) categoryMap.set(cat.id, cat.name);

    const { data: variants } = await supabase.from("product_variants").select("*");
    const variantMap = new Map<string, any[]>();
    if (variants) {
      for (const v of variants) {
        const e = variantMap.get(v.product_id) || [];
        e.push(v);
        variantMap.set(v.product_id, e);
      }
    }

    const transformed = (products || []).map((p: any) => {
      const pv = variantMap.get(p.id) || [];
      const medium = pv.find((v: any) => v.name === "Medium" || v.name === "Steamed");
      const large = pv.find((v: any) => v.name === "Large" || v.name === "Fried");
      return {
        id: p.id,
        name: p.name,
        price: Number(p.base_price),
        price_medium: medium ? Number(medium.price) : Number(p.base_price),
        price_large: large ? Number(large.price) : Number(p.base_price),
        description: p.description || "",
        image: p.image_url || "",
        category: categoryMap.get(p.category_id) || "",
        quantity: p.quantity ?? p.stocks ?? 0,
        availability: p.availability,
        rating: Number(p.rating),
      };
    });
    return NextResponse.json(transformed);
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
    const name = formData.get("name") as string;
    const categoryStr = formData.get("category") as string;
    const price = parseFloat(formData.get("price") as string) || 0;
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
      if (uploadError)
        return NextResponse.json({ error: "Image upload failed: " + uploadError.message }, { status: 500 });
      const { data: urlData } = supabase.storage.from("images").getPublicUrl(filename);
      imageUrl = urlData.publicUrl;
    }

    const existingCat = await getCategoryByName(supabase, categoryStr);
    let categoryId = existingCat?.id;
    if (!categoryId) {
      const slug = categoryStr.toLowerCase().replace(/\s+/g, "-");
      const { data: newCat } = await createCategory(supabase, { name: categoryStr, slug });
      categoryId = newCat?.id;
    }

    const availability = quantity > 0 ? "available" : "sold_out";
    const { data, error } = await createProduct(supabase, {
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      category_id: categoryId,
      base_price: price,
      image_url: imageUrl,
      description,
      quantity,
      buffer_quantity: bufferQuantity,
      availability,
      rating: 5.0,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
