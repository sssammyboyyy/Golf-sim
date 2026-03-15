export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('[YOCO WEBHOOK] Received payload:', JSON.stringify(body, null, 2));

        const { type, payload } = body;

        // 1. Validate Webhook Type
        if (type !== 'checkout.successful') {
            console.log(`[YOCO WEBHOOK] Ignoring non-successful event: ${type}`);
            return NextResponse.json({ received: true });
        }

        const checkoutId = payload.id;
        const amount = payload.amount / 100;
        const currency = payload.currency;
        const status = payload.status;
        const bookingId = payload.metadata?.bookingId;

        console.log(`[YOCO WEBHOOK] Processing successful payment for Checkout: ${checkoutId}, Booking: ${bookingId}, Amount: ${amount} ${currency}`);

        if (!bookingId) {
            console.error('[YOCO WEBHOOK] Critical Error: No bookingId found in Yoco metadata!');
            return NextResponse.json({ error: 'Missing bookingId in metadata' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 2. Fetch Booking
        const { data: booking, error: fetchError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) {
            console.error(`[YOCO WEBHOOK] DB Error: Could not find booking ${bookingId}`);
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // 3. Prevent Duplicates
        if (booking.status === 'confirmed') {
            console.log(`[YOCO WEBHOOK] Booking ${bookingId} is already confirmed. Skipping update.`);
            return NextResponse.json({ success: true, alreadyConfirmed: true });
        }

        // 4. Atomic Update
        const { error: updateError } = await supabase
            .from('bookings')
            .update({
                status: 'confirmed',
                payment_status: 'paid_online',
                amount_paid: amount,
                yoco_payment_id: checkoutId,
                updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

        if (updateError) {
            console.error(`[YOCO WEBHOOK] DB Update Error for booking ${bookingId}:`, updateError.message);
            return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
        }

        console.log(`[YOCO WEBHOOK] Successfully confirmed booking ${bookingId}`);

        // 5. Trigger n8n Automation
        const n8nUrl = process.env.N8N_WEBHOOK_URL;
        const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

        if (n8nUrl && n8nSecret) {
            console.log(`[YOCO WEBHOOK] Pinging n8n for booking ${bookingId}...`);
            try {
                const n8nResponse = await fetch(n8nUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bookingId: bookingId,
                        secret: n8nSecret,
                        source: 'yoco_webhook'
                    }),
                });

                if (n8nResponse.ok) {
                    console.log(`[YOCO WEBHOOK] n8n triggered successfully for booking ${bookingId}`);
                } else {
                    console.error(`[YOCO WEBHOOK] n8n responded with error: ${n8nResponse.status}`);
                }
            } catch (err: any) {
                console.error(`[YOCO WEBHOOK] Failed to ping n8n: ${err.message}`);
            }
        }

        return NextResponse.json({ success: true, bookingId });

    } catch (error: any) {
        console.error('[YOCO WEBHOOK] Payload Error:', error.message);
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
};
