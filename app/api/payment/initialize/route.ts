export const dynamic = "force-dynamic"

import { createClient } from "@supabase/supabase-js"
import { getCorrelationId, logEvent } from "@/lib/logger"
import { getSupabaseAdmin } from "@/lib/supabase/client"
import { getOperatingHours } from "@/lib/schedule-config"
import { sendStoreReceiptEmail, sendGuestConfirmationEmail } from "@/lib/mail"
import { NextResponse } from "next/server"

// Helper: Calculate text end time
function calculateEndTimeText(start: string, duration: number): string {
  const [hours, minutes] = start.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  date.setHours(date.getHours() + duration)
  return date.toTimeString().slice(0, 5)
}

// Helper: Safely parse Postgres timestamptz strings into Milliseconds
function parsePgDate(pgDateStr: string): number {
  if (!pgDateStr) return 0;
  let safeStr = pgDateStr.replace(' ', 'T');
  if (/([+-]\d{2})$/.test(safeStr)) safeStr += ':00';
  const ms = new Date(safeStr).getTime();
  return isNaN(ms) ? 0 : ms;
}

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request)
  const idempotencyKey = (request as any).headers.get("x-idempotency-key")

  logEvent("booking_initialize_start", { correlationId, idempotencyKey })

  try {
    const body = await request.json()
    
    // ELEVATED PRIVILEGES: Explicitly use Service Role Key for RLS Bypass
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. DATA EXTRACTION & VALIDATION
    const booking_date = body.booking_date || body.date
    const start_time = body.start_time || body.timeSlot
    const duration_hours = body.duration_hours || body.duration

    if (!booking_date || !start_time || !duration_hours) {
      return NextResponse.json({ error: "Missing required session data (date, time, or duration)." }, { status: 400 });
    }

    // 2. SANITY CHECK DATE STRINGS
    const cleanTime = (start_time || "").length === 5 ? `${start_time}:00` : start_time;
    const sastStartIso = `${booking_date}T${cleanTime}+02:00`;
    const durationNum = Number(duration_hours);
    const startDate = new Date(sastStartIso);
    
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid booking time or date format." }, { status: 400 });
    }

    const endDate = new Date(startDate.getTime() + (durationNum * 60 * 60 * 1000));
    const reqStartMs = startDate.getTime()
    const reqEndMs = endDate.getTime()

    // 3. UNIVERSAL BAY AUTO-ALLOCATION (The Resource Guard)
    const { data: overlaps, error: overlapError } = await supabaseAdmin
      .from("bookings")
      .select("simulator_id, slot_start, slot_end")
      .eq("booking_date", booking_date)
      .neq("status", "cancelled")

    if (overlapError) throw overlapError;

    const occupiedBays = new Set<number>();
    if (overlaps) {
      overlaps.forEach(b => {
        const bStart = parsePgDate(b.slot_start);
        const bEnd = parsePgDate(b.slot_end);
        if (bStart < reqEndMs && bEnd > reqStartMs) {
          occupiedBays.add(b.simulator_id);
        }
      });
    }

    const assignedSimulatorId = [1, 2, 3].find(id => !occupiedBays.has(id));

    if (!assignedSimulatorId) {
      return NextResponse.json(
        { error: "Fully booked! No bays available for this time slot.", error_code: "SLOT_UNAVAILABLE", correlation_id: correlationId },
        { status: 409 }
      );
    }

    // 4. WALK-IN BYPASS
    if (body.guest_email?.toLowerCase().includes('walkin@venue-os.com') || body.user_type === 'walk_in') {
      logEvent("walkin_bypass_triggered", { correlationId })
      
      const emailProps = {
        guest_email: body.guest_email,
        guest_name: body.guest_name || "Golfer",
        booking_date: body.booking_date,
        start_time: body.start_time,
        duration_hours: Number(body.duration_hours),
        player_count: Number(body.player_count),
        simulator_id: assignedSimulatorId,
        total_price: Number(body.total_price),
        amount_paid: 0, 
      };

      // Dual concurrent dispatch
      await Promise.allSettled([
        sendStoreReceiptEmail(emailProps),
        sendGuestConfirmationEmail(emailProps)
      ]);

      return NextResponse.json({ success: true, bypassed: true, assigned_bay: assignedSimulatorId });
    }

    // 5. CONTINUE ONLINE FLOW
    const player_count = body.player_count || body.players
    const session_type = body.session_type || body.sessionType
    const famous_course_option = body.famous_course_option || body.sessionType
    const base_price = body.base_price || 0
    const total_price = body.total_price || body.totalPrice
    const guest_name = body.guest_name || body.customerName
    const guest_email = body.guest_email || body.customerEmail
    const guest_phone = body.guest_phone || body.customerPhone

    const {
      accept_whatsapp,
      enter_competition,
      coupon_code,
      pay_full_amount,
      addon_coaching,
      addon_club_rental
    } = body

    let dbTotalPrice = Number(total_price || base_price || 0)
    let dbAmountDue = dbTotalPrice
    let dbAmountPaid = 0
    let dbPaymentStatus = "pending"
    let dbStatus = "pending"
    let skipYoco = false
    let couponApplied = null

    const cleanCouponCode = coupon_code ? String(coupon_code).trim().toUpperCase() : null

    if (cleanCouponCode) {
      const { data: couponData } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", cleanCouponCode)
        .eq("is_active", true)
        .single()

      if (couponData) {
        couponApplied = cleanCouponCode
        if (couponData.discount_percent === 100) {
          // 100% Discount: Due becomes 0. Treat it as fully "paid" via coupon to balance the ledger.
          dbAmountDue = 0
          dbAmountPaid = dbTotalPrice 
          dbPaymentStatus = "completed"
          dbStatus = "confirmed"
          skipYoco = true
        } else if (couponData.discount_percent > 0) {
          const discountAmount = (Number(base_price || dbTotalPrice) * (couponData.discount_percent / 100))
          dbAmountDue = Math.max(0, dbTotalPrice - discountAmount)
        }
      }
    }

    const operatingHours = getOperatingHours(startDate);
    if (operatingHours) {
      const closeIso = `${booking_date}T${operatingHours.close.toString().padStart(2, '0')}:00:00+02:00`;
      if (reqEndMs > new Date(closeIso).getTime()) {
        return NextResponse.json({ error: `Venue closes at ${operatingHours.close}:00.`, error_code: "PAST_CLOSING_TIME" }, { status: 400 });
      }
    }

    const bookingRequestId = body.booking_request_id || crypto.randomUUID()
    
    // 1. DEPOSIT MATH & INTENT
    const isDepositEligible = session_type.includes('ball') || session_type.includes('famous');
    const depositAmount = isDepositEligible ? Math.ceil(dbTotalPrice * 0.4) : dbTotalPrice;
    const amountToCharge = (pay_full_amount || !isDepositEligible) ? dbTotalPrice : depositAmount;

    // 3. ZERO-TRUST LEDGER INSERT
    // We MUST set amount_paid to 0. It is only updated when the Manager clicks Settle in the HUD.
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        booking_request_id: bookingRequestId,
        booking_date,
        start_time,
        end_time: calculateEndTimeText(start_time, durationNum),
        slot_start: sastStartIso,
        slot_end: endDate.toISOString(),
        duration_hours: durationNum,
        player_count,
        simulator_id: assignedSimulatorId,
        user_type: "guest",
        session_type,
        famous_course_option,
        base_price,
        total_price: dbTotalPrice,
        amount_paid: dbAmountPaid,
        amount_due: dbAmountDue,
        payment_type: skipYoco ? 'bypass' : (dbTotalPrice - amountToCharge > 0 ? 'deposit' : 'full'),
        status: dbStatus,
        payment_status: dbPaymentStatus,
        guest_name,
        guest_email,
        guest_phone,
        accept_whatsapp,
        enter_competition,
        coupon_code: couponApplied,
        notes: `Expected Online Payment: R${amountToCharge}`, // Passes context to HUD
        addon_coaching: addon_coaching || false,
        addon_club_rental: addon_club_rental || false,
        booking_source: 'online'
      })
      .select()
      .single()

    if (bookingError) throw bookingError;

    // --- SURGICAL BYPASS GUARD (100% Coupon) ---
    if (booking.amount_due <= 0) {
      // 1. Explicitly ensure DB state matches confirmation intent
      const { data: bypassBooking, error: bypassError } = await supabaseAdmin
        .from('bookings')
        .update({ 
          status: 'confirmed', 
          payment_status: 'paid_online', 
          amount_paid: dbTotalPrice, 
          amount_due: 0 
        })
        .eq('id', booking.id)
        .select()
        .single();

      if (bypassError) {
        logEvent("bypass_update_failed", { correlationId, error: bypassError.message }, "error");
      }

      // 2. Fire confirmation emails (Non-blocking)
      if (bypassBooking) {
        Promise.allSettled([
          sendGuestConfirmationEmail(bypassBooking),
          sendStoreReceiptEmail(bypassBooking)
        ]);
      }

      // 3. Early return to prevent Yoco API URL generation
      return NextResponse.json({ redirectUrl: `/success?booking_id=${booking.id}` }); 
    }

    // 2. ENRICHED YOCO URL
    const yocoPublicSlug = "mgan"; 
    const paymentUrl = new URL(`https://pay.yoco.com/${yocoPublicSlug}`);
    
    // Yoco Public Links accept amount and reference. We pack the reference for max context.
    const safeName = guest_name ? guest_name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') : 'Guest';
    const shortId = booking.id.substring(0, 6);
    
    paymentUrl.searchParams.append('amount', amountToCharge.toString());
    paymentUrl.searchParams.append('reference', `${safeName}-${shortId}`);
    
    // Attempt to pre-fill Yoco's internal fields
    if (guest_name) paymentUrl.searchParams.append('name', guest_name);
    if (guest_email) paymentUrl.searchParams.append('email', guest_email);
    paymentUrl.searchParams.append('description', `Booking: ${session_type}`);

    if (dbTotalPrice === 0) {
      Promise.allSettled([
        sendStoreReceiptEmail(booking),
        sendGuestConfirmationEmail(booking)
      ]);
    }

    return Response.json({ 
      checkoutUrl: paymentUrl.toString(), 
      yocoId: null 
    });

  } catch (error: any) {
    logEvent("initialize_error", { error: error.message }, "error")
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}