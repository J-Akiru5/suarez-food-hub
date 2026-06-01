import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Fetch order to verify ownership
  const { data: order, error: fetchError } = await serviceSupabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only allow cancelling pending orders
  if (body.status === 'cancelled' && order.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending orders can be cancelled' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await serviceSupabase
    .from('orders')
    .update({ status: body.status })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Restore stock when order is cancelled
  if (body.status === 'cancelled' && order.order_items) {
    for (const item of order.order_items) {
      const { data: product } = await serviceSupabase
        .from('products')
        .select('stocks')
        .eq('id', item.product_id)
        .single();

      if (product) {
        const restoredStocks = product.stocks + item.quantity;
        await serviceSupabase
          .from('products')
          .update({
            stocks: restoredStocks,
            availability: 'available',
          })
          .eq('id', item.product_id);
      }
    }
  }

  return NextResponse.json(updated);
}
