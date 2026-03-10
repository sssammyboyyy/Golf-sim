import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// The webhook secret from Yoco Dashboard
const YOCO_WEBHOOK_SECRET = process.env.YOCO_WEBHOOK_SECRET;

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const headers = req.headers;
        const signature = headers.get('webhook-signature'); // Yoco specific signature header

        // 1. Validate Webhook Signature
        if (!signature || !YOCO_WEBHOOK_SECRET) {
            console.error('Yoco Webhook verification failed: Missing signature or secret from env.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Example of Yoco HMAC SHA256 Signature Validation with Web Crypto API (Edge-compatible)
        const encoder = new TextEncoder();
        const keyData = encoder.encode(YOCO_WEBHOOK_SECRET);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            encoder.encode(rawBody)
        );

        const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        if (signature !== expectedSignature) {
            console.error('Yoco Webhook signature mismatch');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        console.log(`[VERIFY] Webhook payload valid. Event type: ${payload.type}. Initiating DB update...`);

        // 2. Process specific webhook events
        if (payload.type === 'payment.succeeded') {
            const paymentData = payload.data;
            const checkoutId = paymentData.checkoutId || paymentData.metadata?.checkoutId; // Map according to actual Yoco payload schema

            if (!checkoutId) {
                console.error('Missing checkoutId in Yoco payload metadata.');
                return NextResponse.json({ error: 'Missing checkoutId' }, { status: 400 });
            }

            // 3. Atomically confirm the booking in PostgreSQL
            // We only update if status is 'pending', respecting the new DB State Machine.
            // If the row is updated, the internal Postgres Trigger will fire to hit n8n.
            const { data: updatedBooking, error } = await supabaseAdmin
                .from('bookings')
                .update({
                    status: 'confirmed',
                    payment_status: 'paid_online',
                    amount_paid: paymentData.amount || 0,
                    yoco_payment_id: paymentData.id
                })
                .match({
                    yoco_checkout_id: checkoutId, // Assume checkout ID connects them, or custom metadata booking_request_id
                    status: 'pending'
                })
                .select()
                .single();

            if (error) {
                console.error('Database update failed during Yoco webhook processing:', error);
                // It's possible the state machine rejected a bad transition, return 200 so Yoco stops retrying on structural errors, 
                // or 500 if it's a true DB partition failure.
                return NextResponse.json({ error: 'Database update failed', details: error.message }, { status: 200 }); // Return 200 to ack so yoco doesn't infinitely retry invalid states
            }

            if (!updatedBooking) {
                console.log(`Booking connected to checkoutId ${checkoutId} not found, or not in pending state.`);
                return NextResponse.json({ message: 'Booking already confirmed or not pending.' }, { status: 200 });
            }

            console.log(`Successfully confirmed booking ${updatedBooking.id} via webhook.`);

            return NextResponse.json({ success: true, booking_id: updatedBooking.id }, { status: 200 });
        }

        // Acknowledge other events without processing
        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error('Error processing Yoco Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Force edge runtime for Cloudflare
export const runtime = 'edge';
