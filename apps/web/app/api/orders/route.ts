import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { cart, delivery_address, delivery_contact, payment_method, gcash_reference, subtotal, delivery_fee, total } = body;

  if (!cart?.length || !delivery_address || !delivery_contact) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check stock for all items before creating order
  const stockErrors: string[] = [];
  for (const item of cart) {
    const { data: product } = await serviceSupabase
      .from('products')
      .select('name, stocks')
      .eq('id', item.id)
      .single();

    if (!product) {
      stockErrors.push(`"${item.name}" not found`);
    } else if (product.stocks < item.quantity) {
      stockErrors.push(`"${product.name}" only has ${product.stocks} left, you ordered ${item.quantity}`);
    }
  }

  if (stockErrors.length > 0) {
    return NextResponse.json({ error: 'Insufficient stock', details: stockErrors }, { status: 409 });
  }

  // Ensure profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existingProfile) {
    await serviceSupabase.from('profiles').insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
      phone: delivery_contact,
      address: delivery_address,
      role: 'customer',
    });
  }

  // Create order
  const { data: order, error: orderError } = await serviceSupabase
    .from('orders')
    .insert([{
      customer_id: user.id,
      status: 'pending',
      payment_method: payment_method,
      payment_status: payment_method === 'gcash' ? 'pending' : 'pending',
      gcash_reference_no: gcash_reference || null,
      delivery_address,
      delivery_contact,
      subtotal,
      delivery_fee,
      total,
    }])
    .select()
    .single();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  // Insert order items and deduct stock with rollback on failure
  let itemInsertFailed = false;
  for (const item of cart) {
    const { error: itemError } = await serviceSupabase
      .from('order_items')
      .insert([{
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        variant_name: item.variant || null,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }]);

    if (itemError) {
      itemInsertFailed = true;
      break;
    }

    // Deduct stock
    const { data: currentProduct } = await serviceSupabase
      .from('products')
      .select('stocks')
      .eq('id', item.id)
      .single();

    if (currentProduct) {
      const newStocks = currentProduct.stocks - item.quantity;
      const { error: updateError } = await serviceSupabase
        .from('products')
        .update({
          stocks: newStocks,
          availability: newStocks <= 0 ? 'sold_out' : 'available',
        })
        .eq('id', item.id);

      if (updateError) {
        itemInsertFailed = true;
        break;
      }
    }
  }

  // Rollback if anything failed — delete the order
  if (itemInsertFailed) {
    await serviceSupabase.from('orders').delete().eq('id', order.id);
    await serviceSupabase.from('order_items').delete().eq('order_id', order.id);
    return NextResponse.json({ error: 'Failed to process order items. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, orderId: order.id });
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = serviceSupabase
    .from('orders')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
