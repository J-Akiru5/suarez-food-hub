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
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });

    const { data: categories } = await supabase.from("categories").select("*");
    const categoryMap = new Map<string, string>();
    if (categories) {
      for (const cat of categories) categoryMap.set(cat.id, cat.name);
    }

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
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceSupabase();
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

    const { data: existingCat } = await supabase.from("categories").select("id").eq("name", categoryStr).single();
    let categoryId = existingCat?.id;
    if (!categoryId) {
      const slug = categoryStr.toLowerCase().replace(/\s+/g, "-");
      const { data: newCat } = await supabase.from("categories").insert({ name: categoryStr, slug }).select().single();
      categoryId = newCat?.id;
    }

    const availability = quantity > 0 ? "available" : "sold_out";
    const { data, error } = await supabase
      .from("products")
      .insert([
        {
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
        },
      ])
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
