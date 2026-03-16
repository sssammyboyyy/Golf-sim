import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logEvent } from '@/lib/utils';



/**
 * API route for securely fetching anomalous bookings for the admin "Health" tab.
 * An anomaly is defined as a booking that has a Yoco payment ID but has not yet been confirmed as paid.
 */
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { pin } = body;

    // Initialize admin client directly to avoid module resolution issues
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE!
    );

    const adminPin = process.env.ADMIN_PIN || "8821";

    // 1. Authorization: Must provide the correct admin PIN
    if (pin !== adminPin) {
        logEvent('anomalies_fetch_unauthorized', {}, 'warn');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logEvent('anomalies_fetch_start', {});

    try {
        // 2. Fetch Anomalies:
        // - Has a yoco_payment_id (payment was attempted)
        // - amount_paid is 0 (not yet confirmed/healed)
        // - status is 'pending'
        // - Within the last 72 hours to keep the query fast
        const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

        const { data: anomalies, error } = await supabaseAdmin
            .from('bookings')
            .select('id, guest_name, guest_email, yoco_payment_id, created_at, total_price')
            .not('yoco_payment_id', 'is', null)
            .eq('status', 'pending')
            .lt('amount_paid', 0.01)
            .gte('created_at', threeDaysAgo)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch anomalies: ${error.message}`);
        }

        return NextResponse.json({ success: true, anomalies });

    } catch (error: any) {
        logEvent('anomalies_fetch_error', { error: error.message }, 'error');
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}