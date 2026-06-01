import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await req.formData();

  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const price = parseFloat(formData.get('price') as string) || 0;
  const price_medium = parseFloat(formData.get('price_medium') as string) || 0;
  const price_large = parseFloat(formData.get('price_large') as string) || 0;
  const description = formData.get('description') as string;
  const stocks = parseInt(formData.get('stocks') as string) || 0;
  const imageFile = formData.get('image') as File | null;
  let imageUrl = formData.get('existing_image') as string || '';

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop();
    const filename = `${Date.now()}_${name.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filename, imageFile, { contentType: imageFile.type, upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(filename);
      imageUrl = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from('products')
    .update({
      name,
      category,
      price,
      price_medium,
      price_large,
      description,
      image: imageUrl,
      stocks,
      availability: stocks > 0 ? 'Available' : 'Sold Out',
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
