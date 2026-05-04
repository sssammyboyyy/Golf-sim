import { NextResponse, after } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { dispatchBookingConfirmations } from '@/lib/email/dispatcher';

export async function POST(req: Request) {
  try {
    // Extract the raw body for signature verification
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('Webhook-Signature');
    const webhookSecret = process.env.YOCO_WEBHOOK_SECRET;

    if (!signatureHeader) {
      return NextResponse.json({ error: 'Missing Webhook-Signature header' }, { status: 401 });
    }

    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify the HMAC-SHA256 signature
    // Note: Adjust the digest format ('base64' or 'hex') if Yoco specifies differently in their documentation.
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('base64'); 

    if (crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature)) === false) {
       // Optional fallback to check hex if base64 isn't what they send
       const expectedSignatureHex = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
       if (signatureHeader !== expectedSignatureHex) {
           return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
       }
    }

    // Parse the known safe JSON payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Ensure this is the correct event type
    if (payload.type !== 'payment.succeeded') {
      // Yoco sends other events, we can just ignore them and return 200 to acknowledge receipt
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    const bookingId = payload.payload?.metadata?.booking_id || payload.metadata?.booking_id;
    const amountPaid = payload.payload?.amount || payload.amount || 0;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing metadata.booking_id in payload' }, { status: 400 });
    }

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Perform an idempotent update
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'completed',
        amount_paid: amountPaid,
      })
      .eq('id', bookingId)
      .eq('payment_status', 'pending')
      .select();

    if (error) {
      // 23P01 is the PostgreSQL exclusion constraint (EXCLUDE USING gist) violation code
      if (error.code === '23P01' || error.message.includes('overlapping') || error.message.includes('conflicting key value')) {
        console.error(`CRITICAL [23P01]: Payment collected for ${bookingId} but slot constraint failed. Marking as requires_refund.`);
        
        // Failover: Save the transaction asynchronously so it does not ghost
        await supabase
          .from('bookings')
          .update({
            status: 'requires_refund',
            payment_status: 'completed',
            amount_paid: amountPaid
          })
          .eq('id', bookingId);
          
        // NOTE: Optional admin alert hook could be triggered here via after()
        // Webhook shouldn't fail for Yoco to keep retrying if we correctly logged it.
        return NextResponse.json({ message: 'Payment successful but slot was taken. Marked for refund.', booking_id: bookingId }, { status: 200 });
      }

      console.error('Supabase update error:', error);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    if (data && data.length === 0) {
      // It's possible the booking was already completed or genuinely deleted
      return NextResponse.json({ message: 'Booking not found or not in pending payment state' }, { status: 200 });
    }

    // Unleash the state-aware background dispatcher
    after(() => dispatchBookingConfirmations(bookingId));

    return NextResponse.json({ message: 'Webhook processed successfully', booking_id: bookingId }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
