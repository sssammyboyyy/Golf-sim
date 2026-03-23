export const dynamic = 'force-dynamic';

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { logEvent } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pin } = body;

        const adminPin = process.env.ADMIN_PIN || "8821";

        // 1. Authorization
        if (pin !== adminPin) {
            logEvent('anomalies_fetch_unauthorized', {}, 'warn');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        logEvent('anomalies_fetch_start', {});

        const supabase = getSupabaseAdmin();

        // 2. Fetch Anomalies
        const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

        const { data: anomalies, error } = await supabase
            .from('bookings_test')
            .select('id, guest_name, guest_email, yoco_payment_id, created_at, total_price')
            .not('yoco_payment_id', 'is', null)
            .eq('status', 'pending')
            .lt('amount_paid', 0.01)
            .gte('created_at', threeDaysAgo)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch anomalies: ${error.message}`);
        }

        return Response.json({ success: true, anomalies });

    } catch (error: any) {
        logEvent('anomalies_fetch_error', { error: error.message }, 'error');
        return Response.json({ error: error.message }, { status: 500 });
    }
}
