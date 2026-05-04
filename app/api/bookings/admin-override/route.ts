import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { booking_id, total_price, amount_paid, admin_pin } = body;

    if (!booking_id || total_price === undefined || amount_paid === undefined || !admin_pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (admin_pin !== process.env.ADMIN_PIN) {
      return NextResponse.json({ error: 'Invalid admin PIN' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let payment_status = 'pending';
    let status = 'pending';

    if (amount_paid >= total_price) {
      payment_status = 'completed';
      status = 'confirmed';
    } else if (amount_paid > 0 && amount_paid < total_price) {
      payment_status = 'partial';
      status = 'confirmed';
    }

    const updates: any = {
      total_price: Number(total_price),
      amount_paid: Number(amount_paid),
      payment_status: payment_status,
      status: status,
      amount_due: Math.max(0, Number(total_price) - Number(amount_paid))
    };

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', booking_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update booking ledger' }, { status: 500 });
    }

    return NextResponse.json(updatedBooking, { status: 200 });

  } catch (error: any) {
    console.error('Admin override error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
