export const dynamic = 'force-dynamic';


import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logEvent } from '@/lib/logger';

export async function POST(request: Request) {
    let bookingId: string | undefined;
    try {
        const body = await request.json();
        bookingId = body.bookingId;
        const { pin, amountPaid, paymentMethod = 'instore' } = body;

        const adminPin = process.env.ADMIN_PIN || "8821";
        const n8nUrl = process.env.N8N_WEBHOOK_URL;

        // 1. Authorization
        if (pin !== adminPin) {
            logEvent('manual_confirm_unauthorized', { bookingId }, 'warn');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Validation
        if (!bookingId || !n8nUrl) {
            const missing = !bookingId ? 'bookingId' : 'N8N_WEBHOOK_URL';
            logEvent('manual_confirm_validation_failed', { missing }, 'error');
            return Response.json({ error: `Missing required parameter: ${missing}` }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 3. Update Booking
        const { data: updatedBooking, error: updateError } = await supabase
            .from('bookings_test')
            .update({
                status: 'confirmed',
                payment_status: paymentMethod,
                amount_paid: amountPaid,
                confirmed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .select()
            .single();

        if (updateError) {
            logEvent('manual_confirm_db_update_failed', { bookingId, error: updateError.message }, 'error');
            throw new Error(`Failed to update booking: ${updateError.message}`);
        }

        logEvent('manual_confirm_success', { bookingId });

        // 4. Trigger Automation
        const n8nAdminSecret = process.env.N8N_ADMIN_SECRET;
        if (!n8nAdminSecret) throw new Error("N8N_ADMIN_SECRET is not configured.");

        await fetch(n8nUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                bookingId: updatedBooking.id,
                secret: n8nAdminSecret
            })
        });

        logEvent('manual_confirm_n8n_triggered', { bookingId });

        return Response.json({ success: true, message: 'Booking confirmed and automation triggered.', booking: updatedBooking });

    } catch (error: any) {
        logEvent('manual_confirm_error', { bookingId, error: error.message }, 'error');
        return Response.json({ error: error.message }, { status: 500 });
    }
};
