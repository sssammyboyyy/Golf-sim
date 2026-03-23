import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { getSASTDate } from '@/lib/utils';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * app/api/webhooks/yoco/route.ts
 * 
 * Hardened Webhook Handler: Two-Phase Commit & Spoofing Prevention.
 */
export async function POST(request: NextRequest) {
    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

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
            .from('bookings')
            .select('id, payment_status, guest_name, guest_email, booking_date, start_time, session_type, duration_hours, player_count, total_price, amount_paid, simulator_id, addon_club_rental, addon_coaching')
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
            .from('bookings')
            .update({
                status: 'confirmed',
                payment_status: 'paid',
                yoco_payment_id: checkoutId,
                email_status: 'pending',
                updated_at: getSASTDate() // Using local SAST helper
            })
            .eq('id', bookingId);

        if (phase1Error) {
            console.error(`[YOCO WEBHOOK] DB Phase 1 Update Failed for ${bookingId}:`, phase1Error.message);
            return NextResponse.json({ error: 'Fulfillment error' }, { status: 500 });
        }

        console.log(`[YOCO WEBHOOK] Phase 1 Success: Booking ${bookingId} marked as confirmed/paid.`);

        // 5. Native Email Dispatch
        try {
            if (!booking.guest_email || booking.guest_email.toLowerCase().includes('walkin@venue-os.com')) {
                console.log(`[Native Email] Invalid or missing guest email (${booking.guest_email}). Skipping dispatch for ${bookingId}`);
            } else {
                const guestName = booking.guest_name || "Golfer";
                const paid = Number(booking.amount_paid || 0).toFixed(2);
                const due = (Number(booking.total_price || 0) - Number(booking.amount_paid || 0)).toFixed(2);
                const bayName = booking.simulator_id === 1 ? "Lounge Bay" : booking.simulator_id === 2 ? "Middle Bay" : booking.simulator_id === 3 ? "Window Bay" : "your simulator";

                const needsClubs = (booking.addon_club_rental === true || String(booking.addon_club_rental).toLowerCase() === 'true');
                const needsCoaching = (booking.addon_coaching === true || String(booking.addon_coaching).toLowerCase() === 'true');

                let addOnsHtml = '';
                if (needsClubs || needsCoaching) {
                    addOnsHtml = `
                    <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:24px;margin-bottom:32px;">
                        <span style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin-bottom:15px;display:block;">✨ Selected Add-ons</span>
                        <table style="width:100%;border-collapse:collapse;">
                            ${needsClubs ? '<tr><td style="padding:8px 0;font-size:14px;color:#92400e;">Club Rental / Hire</td><td style="padding:8px 0;font-size:14px;color:#92400e;text-align:right;font-weight:600;">Included</td></tr>' : ''}
                            ${needsCoaching ? '<tr><td style="padding:8px 0;font-size:14px;color:#92400e;">Coaching Session</td><td style="padding:8px 0;font-size:14px;color:#92400e;text-align:right;font-weight:600;">Included</td></tr>' : ''}
                        </table>
                    </div>`;
                }

                // 5a. Customer Dispatch
                const { error: customerEmailError } = await resend.emails.send({
                    from: "bookings@themulligan.org",
                    to: booking.guest_email,
                    subject: "Booking Confirmed - The Mulligan",
                    html: `
                        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.5;">
                         <div style="background-color:#1a472a;background-image:linear-gradient(135deg,#1a472a 0%,#0d2a19 100%);padding:60px 40px;text-align:center;border-radius:12px 12px 0 0;">
                         <div style="display:inline-block;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 16px;border-radius:100px;font-size:12px;font-weight:600;margin-bottom:20px;">SESSION CONFIRMED</div>
                         <p style="color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;margin:0 0 8px;">The Mulligan</p>
                         <p style="color:#fbbf24;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:0 0 30px;opacity:0.9;">The Simulator Never Judges</p>
                         <h1 style="color:#fff;font-size:32px;font-weight:700;margin:0;line-height:1.2;">You're Teeing Off!</h1>
                         <p style="color:#a3d9a5;font-size:16px;margin:12px 0 0;opacity:0.8;">See you on the green, ${guestName}.</p>
                         </div>
                         <div style="padding:40px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background-color:#ffffff;">
                         <p style="font-size:18px;color:#111827;font-weight:600;margin:0 0 16px;">Exciting news, ${guestName}!</p>
                         <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 32px;">Your booking at The Mulligan is confirmed. We've reserved ${bayName} exclusively for your group.</p>
                         <div style="background-color:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:24px;margin-bottom:32px;">
                         <span style="font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;display:block;">BOOKING DETAILS</span>
                         <table style="width:100%;border-collapse:collapse;">
                         <tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Date</td><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${booking.booking_date}</td></tr>
                         <tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Start Time</td><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${booking.start_time}</td></tr>
                         <tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Duration</td><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${booking.duration_hours} Hours</td></tr>
                         <tr><td style="padding:12px 0;font-size:14px;color:#6b7280;">Players</td><td style="padding:12px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${booking.player_count} Players</td></tr>
                         </table>
                         </div>
                         ${addOnsHtml}
                         <div style="background-color:#ecfdf5;border:1px solid #d1fae5;border-radius:12px;padding:24px;margin-bottom:32px;text-align:center;">
                         <span style="font-size:13px;color:#065f46;opacity:0.7;margin-bottom:12px;display:block;font-weight:500;">PAYMENT RECEIVED</span>
                         <p style="font-size:28px;font-weight:700;color:#065f46;margin:0;">R ${paid}</p>
                         <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(6,95,70,0.1);">
                         <span style="font-size:14px;color:#065f46;font-weight:500;">Balance Due at Venue: </span>
                         <span style="font-size:18px;font-weight:700;color:#92400e;">R ${due}</span>
                         </div></div></div></div>
                    `
                });

                if (customerEmailError) {
                    throw new Error(`Customer Email Failed: ${customerEmailError.message}`);
                }

                // 5b. Store Alert Dispatch
                const { error: storeEmailError } = await resend.emails.send({
                    from: "bookings@themulligan.org",
                    to: "mulligan.store@gmail.com",
                    subject: `BOOKING ALERT: ${guestName}`,
                    html: `
                        <h2>New Booking Confirmed (Online)</h2>
                        <ul>
                            <li><strong>Name:</strong> ${guestName}</li>
                            <li><strong>Bay:</strong> ${bayName}</li>
                            <li><strong>Date:</strong> ${booking.booking_date}</li>
                            <li><strong>Time:</strong> ${booking.start_time} for ${booking.duration_hours} hours</li>
                            <li><strong>Players:</strong> ${booking.player_count}</li>
                            <li><strong>Addons:</strong> Clubs (${needsClubs ? 'Yes' : 'No'}), Coaching (${needsCoaching ? 'Yes' : 'No'})</li>
                            <li><strong>Amount Paid:</strong> R ${paid}</li>
                            <li><strong>Due at Venue:</strong> R ${due}</li>
                        </ul>
                    `
                });

                if (storeEmailError) {
                    // We don't necessarily want to fail the entire loop if only the store email fails,
                    // but we should definitely log it. Let's still mark the DB as sent for the customer.
                    console.error(`[Native Email] Store Alert Failed for ${bookingId}: ${storeEmailError.message}`);
                }

                await supabase
                    .from('bookings')
                    .update({ email_status: 'sent' })
                    .eq('id', bookingId);

                console.log(`[Native Email] Success. Dual-dispatch complete for ${bookingId}`);
            }
        } catch (emailError: any) {
            // 6. Failure State Recovery
            console.error(`[Native Email] Failure for ${bookingId}: ${emailError.message}`);
            
            await supabase
                .from('bookings')
                .update({
                    email_status: 'failed'
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
