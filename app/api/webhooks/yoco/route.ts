import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendGuestConfirmationEmail, sendStoreReceiptEmail } from '@/lib/mail';

// Initialize Supabase Admin strictly outside the handler for edge caching
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Event Type Guard
    if (body.type !== 'payment.succeeded') {
      // Return 200 to acknowledge receipt of events we don't care about
      return NextResponse.json({ received: true, ignored: true });
    }

    const payload = body.payload;
    const bookingId = payload?.metadata?.booking_id;
    const yocoId = payload?.id;

    if (!bookingId) {
      console.error("[WEBHOOK_ERROR] Missing booking_id in metadata");
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    // 2. Idempotency Guard (Double-Tap Protection)
    const { data: existingBooking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('payment_status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !existingBooking) {
      console.error("[WEBHOOK_ERROR] Booking not found:", fetchError);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (existingBooking.payment_status === 'paid_online' || existingBooking.payment_status === 'completed') {
      console.log(`[WEBHOOK_IDEMPOTENCY] Booking ${bookingId} already paid. Skipping.`);
      return NextResponse.json({ received: true, message: 'Already processed' }, { status: 200 });
    }

    // 3. Ledger Reconciliation (Bypass RLS with Admin)
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        payment_status: 'paid_online',
        status: 'confirmed',
        yoco_payment_id: yocoId, // Ensure the live ID is locked in
        amount_paid: payload.amount / 100, // Yoco sends cents, ledger stores ZAR
        payment_verified_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error("[WEBHOOK_CRITICAL] Failed to update ledger:", updateError);
      throw new Error("Database update failed");
    }

    console.log(`[WEBHOOK_SUCCESS] Booking ${bookingId} reconciled as paid_online.`);
    
    // 5. Dispatch Confirmation Emails (Non-blocking)
    Promise.allSettled([
      sendGuestConfirmationEmail(updatedBooking),
      sendStoreReceiptEmail(updatedBooking)
    ]);
    
    // 4. The Mandatory 200 OK (Stops Yoco from retrying)
    return NextResponse.json({ received: true, success: true });

  } catch (error: any) {
    console.error("[WEBHOOK_FATAL]", error.message);
    // Return 500 so Yoco knows it failed and will queue a retry
    return NextResponse.json({ error: 'Internal Webhook Error' }, { status: 500 });
  }
}
