import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { getSASTDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * app/api/webhooks/yoco/route.ts
 * 
 * Hardened Webhook Handler: Two-Phase Commit & Spoofing Prevention.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, payload } = body;

        // 1. Basic Event Filter
        if (type !== 'checkout.successful') {
            console.log(`[YOCO WEBHOOK] Ignoring event: ${type}`);
            return NextResponse.json({ received: true }, { status: 200 });
        }

        const checkoutId = payload.id;
        const bookingId = payload.metadata?.bookingId;

        if (!bookingId || !checkoutId) {
            console.error('[YOCO WEBHOOK] Critical Error: Missing identifiers.');
            return NextResponse.json({ error: 'Missing identifiers' }, { status: 400 });
        }

        // 2. Security: Webhook Spoofing Prevention
        // Verify the checkout status directly with Yoco API to bypass payload tampering.
        const yocoSecret = process.env.YOCO_SECRET_KEY;
        const yocoVerifyUrl = `https://live.yoco.com/v1/checkouts/${checkoutId}`;
        
        const yocoResponse = await fetch(yocoVerifyUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${yocoSecret}`
            }
        });

        if (!yocoResponse.ok) {
            console.error('[YOCO WEBHOOK] Security Alert: Could not verify checkout with Yoco.');
            return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
        }

        const yocoData = await yocoResponse.json();
        const validStatus = ['paid', 'successful'].includes(yocoData.status);

        if (!validStatus) {
            console.error(`[YOCO WEBHOOK] Security Warning: Malicious/Unpaid checkout attempt. ID: ${checkoutId}, Status: ${yocoData.status}`);
            return NextResponse.json({ error: 'Invalid checkout status' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 3. The Idempotency Gate (Corrected)
        // Check ONLY for the primary financial lock: payment_status
        const { data: booking, error: fetchError } = await supabase
            .from('bookings_test')
            .select('id, payment_status')
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) {
            console.error(`[YOCO WEBHOOK] DB Error: Booking ${bookingId} not found.`);
            return NextResponse.json({ error: 'Booking missing' }, { status: 404 });
        }

        if (booking.payment_status === 'paid') {
            console.log(`[Webhook Idempotency] Checkout ${checkoutId} already processed (Status: paid). Safely absorbing.`);
            return NextResponse.json({ received: true }, { status: 200 });
        }

        // 4. Database Fulfillment (Phase 1: Record & Queue)
        // Atomically lock the record and prepare for automation.
        const { error: phase1Error } = await supabase
            .from('bookings_test')
            .update({
                status: 'confirmed',
                payment_status: 'paid',
                yoco_payment_id: checkoutId,
                n8n_status: 'queued',
                updated_at: getSASTDate() // Using local SAST helper
            })
            .eq('id', bookingId);

        if (phase1Error) {
            console.error(`[YOCO WEBHOOK] DB Phase 1 Update Failed for ${bookingId}:`, phase1Error.message);
            return NextResponse.json({ error: 'Fulfillment error' }, { status: 500 });
        }

        console.log(`[YOCO WEBHOOK] Phase 1 Success: Booking ${bookingId} marked as confirmed/paid.`);

        // 5. The Automation Bridge (Phase 2: Dispatch)
        // High-reliability dispatch to n8n with strict payload contract.
        try {
            const automationUrl = process.env.AUTOMATION_WEBHOOK_URL;
            if (!automationUrl) throw new Error("AUTOMATION_WEBHOOK_URL missing");

            const n8nResponse = await fetch(automationUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    valid: true,
                    bookingId: bookingId,
                    secret: process.env.N8N_WEBHOOK_SECRET,
                    correlation_id: checkoutId
                })
            });

            if (!n8nResponse.ok) throw new Error(`n8n responded with ${n8nResponse.status}`);

            console.log(`[Automation Bridge] Phase 2 Dispatch success for ${bookingId}`);

        } catch (autoError: any) {
            // 6. Failure State Recovery
            // Flag the automation failure in the base but KEEP the payment 200 OK.
            console.error(`[Automation Bridge] Phase 2 Failure for ${bookingId}: ${autoError.message}`);
            
            await supabase
                .from('bookings_test')
                .update({
                    n8n_status: 'failed',
                    n8n_last_error: autoError.message
                })
                .eq('id', bookingId);
        }

        // Always finalize with Yoco to stop retries
        return NextResponse.json({ received: true }, { status: 200 });

    } catch (error: any) {
        console.error('[YOCO WEBHOOK] Fatal Handler Crash:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
