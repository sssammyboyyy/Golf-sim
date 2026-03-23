export const dynamic = 'force-dynamic';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const reconcileSecret = process.env.RECONCILE_SECRET;
        const adminPin = process.env.ADMIN_PIN || "8821";

        // Safely parse body for manual triggers
        let body: any = {};
        try {
            body = await request.json();
        } catch {
            // Empty body is fine for cron executions
        }

        const singleBookingId = body?.bookingId;
        const providedPin = body?.pin;

        // Dual-Auth Gateway: Allow valid Bearer Token (Cron) OR valid PIN (Manual Dashboard)
        const isValidCron = authHeader === `Bearer ${reconcileSecret}`;
        const isValidManual = providedPin && providedPin === adminPin;

        if (!isValidCron && !isValidManual) {
            console.warn('[VERIFY] Unauthorized attempt to trigger reconciliation');
            return new Response('Unauthorized', { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        let query = supabase
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
            return Response.json({ message: 'No bookings require reconciliation', processedCount: 0 });
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

                await supabase
                    .from('bookings')
                    .update({
                        amount_paid: actualPaid,
                        status: 'confirmed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', booking.id);

                processedCount++;
                results.push({ bookingId: booking.id, healed: true, actualPaid });

                // EXPLICIT n8n webhook invocation
                console.log(`[VERIFY] Dispatching n8n automation for reconciled booking ${booking.id}...`)
                try {
                    const n8nUrl = process.env.N8N_WEBHOOK_URL;
                    const n8nSecret = process.env.N8N_RECONCILE_SECRET;
                    if (!n8nUrl || !n8nSecret) {
                        throw new Error("N8N_WEBHOOK_URL or N8N_RECONCILE_SECRET is missing.");
                    }

                    await fetch(n8nUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ bookingId: booking.id, secret: n8nSecret })
                    });
                    console.log(`[VERIFY] n8n automation dispatched for booking ${booking.id}`);
                } catch (n8nError: any) {
                    console.error(`[VERIFY] n8n trigger failed for booking ${booking.id}: ${n8nError.message}`);
                    results.push({ bookingId: booking.id, warning: "n8n trigger failed." })
                }
            } else {
                results.push({ bookingId: booking.id, healed: false, yocoStatus: yocoData.status });
            }
        }

        return Response.json({ success: true, processedCount, results });
    } catch (error: any) {
        console.error(`[VERIFY] Reconciliation Error: ${error.message}`);
        return Response.json({ error: error.message }, { status: 500 });
    }
};
