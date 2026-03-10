import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const secret = process.env.RECONCILE_SECRET;

        // Auth Check
        if (authHeader !== `Bearer ${secret}`) {
            console.warn('[VERIFY] Unauthorized attempt to trigger reconciliation');
            return new Response('Unauthorized', { status: 401 });
        }

        // The singleBookingId is retrieved from JSON body now that the method is POST
        let singleBookingId = null;
        try {
            const body = await request.json();
            singleBookingId = body.bookingId;
        } catch {
            // Request might not have a body if triggered strictly as a cron hook
        }

        let query = supabaseAdmin
            .from('bookings')
            .select('id, amount_paid, yoco_payment_id, status, email_sent')
            .not('yoco_payment_id', 'is', null) // Must have attempted payment
            .lt('amount_paid', 0.01);         // Hasn't been marked as paid

        if (singleBookingId) {
            console.log(`[VERIFY] Triggering manual reconciliation for booking: ${singleBookingId}`);
            query = query.eq('id', singleBookingId);
        } else {
            console.log('[VERIFY] Triggering automated cron reconciliation (last 24h)');
            query = query.gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        }

        const { data: bookings, error } = await query;

        if (error) throw error;
        if (!bookings || bookings.length === 0) {
            return NextResponse.json({ message: 'No bookings require reconciliation', processedCount: 0 });
        }

        let processedCount = 0;
        const results = [];

        for (const booking of bookings) {
            console.log(`[VERIFY] Checking Yoco API for payment: ${booking.yoco_payment_id}`);

            const yocoResponse = await fetch(`https://payments.yoco.com/api/checkouts/${booking.yoco_payment_id}`, {
                headers: { Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}` },
            });

            if (!yocoResponse.ok) {
                console.error(`[VERIFY] Yoco API error for ${booking.yoco_payment_id}: ${yocoResponse.statusText}`);
                results.push({ bookingId: booking.id, error: `Yoco API returned ${yocoResponse.statusText}` });
                continue;
            }

            const yocoData = await yocoResponse.json();

            // If Yoco says it's paid, self-heal the database
            if (yocoData.status === 'successful') {
                const actualPaid = yocoData.metadata?.depositPaid ?? (yocoData.amount / 100);
                console.log(`[VERIFY] Healing database. Updating booking ${booking.id} to amount_paid: ${actualPaid}`);

                await supabaseAdmin
                    .from('bookings')
                    .update({
                        amount_paid: actualPaid,
                        status: 'confirmed',
                        email_sent: true, // Mark it true before triggering n8n to prevent identical loops
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', booking.id);

                processedCount++;
                results.push({ bookingId: booking.id, healed: true, actualPaid });

                // EXPLICIT n8n webhook invocation: Since PG triggers don't run n8n on UPDATEs (to prevent duplicate emails), we manually prompt it for reconciled transactions.
                console.log(`[VERIFY] Dispatching n8n automation for reconciled booking ${booking.id}...`)
                try {
                    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.srv1127912.hstgr.cloud/webhook/booking-confirmed';
                    await fetch(n8nUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ booking_id: booking.id, yoco_payment_id: booking.yoco_payment_id })
                    });
                    console.log(`[VERIFY] n8n automation dispatched for booking ${booking.id}`);
                } catch (n8nError) {
                    console.error(`[VERIFY] n8n trigger failed for booking ${booking.id}:`, n8nError);
                    results.push({ bookingId: booking.id, warning: "n8n trigger failed to reach webhook" })
                }
            } else {
                results.push({ bookingId: booking.id, healed: false, yocoStatus: yocoData.status });
            }
        }

        return NextResponse.json({ success: true, processedCount, results });
    } catch (error: any) {
        console.error(`[VERIFY] Reconciliation Error: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
