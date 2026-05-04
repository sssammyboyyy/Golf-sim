import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the timestamp for 15 minutes ago
    const cutoffTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // In Supabase, doing an update with an `lt` filter will return the modified rows if we ask for selection
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .lt('created_at', cutoffTime)
      .select('id');

    if (error) {
      console.error('Error reaping ghost bookings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Ghost bookings reaped successfully',
      deleted_count: data?.length || 0,
      deleted_ids: data?.map((b) => b.id) || [],
    });
  } catch (error: any) {
    console.error('Cron reap error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
