import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings = data.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const qrcodeFile = formData.get('gcash_qr') as File | null;

  if (!qrcodeFile || qrcodeFile.size === 0) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  const ext = qrcodeFile.name.split('.').pop();
  const filename = `gcash_qr_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('admin-settings')
    .upload(filename, qrcodeFile, { contentType: qrcodeFile.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: 'Image upload failed: ' + uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('admin-settings').getPublicUrl(filename);
  const imageUrl = urlData.publicUrl;

  const { error: dbError } = await supabase
    .from('settings')
    .upsert({ key: 'gcash_qr_url', value: imageUrl, updated_at: new Date().toISOString() });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true, url: imageUrl });
}
