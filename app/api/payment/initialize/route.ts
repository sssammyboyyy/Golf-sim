export const dynamic = "force-dynamic"

import { createClient } from "@supabase/supabase-js"
import { getCorrelationId, logEvent, validateEnvVars } from "@/lib/logger"
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
    const envCheck = validateEnvVars([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      // YOCO_SECRET_KEY removed from mandatory list to allow Mock Gateway fallback
    ]);

    if (envCheck) {
      logEvent("env_validation_failed", { correlationId, missing: envCheck.missing }, "error")
      return NextResponse.json(
        { error: "Server configuration error", error_code: "MISSING_ENV", correlation_id: correlationId },
        { status: 500 }
      );
    }

    const body = await request.json()
    const supabaseAdmin = getSupabaseAdmin()

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

    // 5. CONTINUE ONLINE FLOW (Yoco Path)
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

    let dbTotalPrice = Number(total_price)
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
          dbTotalPrice = 0
          dbPaymentStatus = "completed"
          dbStatus = "confirmed"
          skipYoco = true
        } else if (couponData.discount_percent > 0) {
          const discountAmount = (Number(base_price) * (couponData.discount_percent / 100));
          dbTotalPrice = Math.max(0, Number(base_price) - discountAmount);
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
    const amountToCharge = (session_type?.includes("famous") && !pay_full_amount) ? Math.ceil(dbTotalPrice * 0.40) : dbTotalPrice;
    const outstandingBalance = dbTotalPrice - amountToCharge;

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
        amount_paid: skipYoco ? dbTotalPrice : 0,
        payment_type: skipYoco ? 'bypass' : (outstandingBalance > 0 ? 'deposit' : 'full'),
        status: dbStatus,
        payment_status: dbPaymentStatus,
        guest_name,
        guest_email,
        guest_phone,
        accept_whatsapp,
        enter_competition,
        coupon_code: couponApplied,
        addon_coaching: addon_coaching || false,
        addon_club_rental: addon_club_rental || false,
      })
      .select()
      .single()

    if (bookingError) throw bookingError;

    // --- BYPASS EMAIL DISPATCH (100% Coupon) ---
    if (skipYoco) {
      const emailProps = {
        guest_email,
        guest_name: guest_name || "Golfer",
        booking_date,
        start_time,
        duration_hours: durationNum,
        player_count,
        simulator_id: assignedSimulatorId,
        total_price: dbTotalPrice,
        amount_paid: dbTotalPrice,
        addon_club_rental,
        addon_coaching
      };

      await Promise.allSettled([
        sendStoreReceiptEmail(emailProps),
        sendGuestConfirmationEmail(emailProps)
      ]);

      return Response.json({ free_booking: true, booking_id: booking.id, assigned_bay: assignedSimulatorId })
    }

    // --- YOCO MOCK GATEWAY FALLBACK ---
    const yocoSecret = process.env.YOCO_SECRET_KEY;
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://bestmulligan.golf-sim.pages.dev';

    if (!yocoSecret || yocoSecret.trim().length < 10 || yocoSecret.includes('insert_your_key')) {
      console.log("[YOCO MOCK GATEWAY] No valid secret key found. Simulating checkout.");
      
      const mockYocoId = `mock_chk_${Math.random().toString(36).substring(2, 10)}`;
      
      await supabaseAdmin
        .from('bookings')
        .update({ yoco_payment_id: mockYocoId })
        .eq('id', booking.id);

      await Promise.allSettled([
        sendStoreReceiptEmail({
          guest_email, guest_name: guest_name || "Golfer", guest_phone,
          booking_date, start_time, duration_hours: durationNum, player_count,
          simulator_id: assignedSimulatorId, total_price: dbTotalPrice,
          amount_paid: 0, addon_club_rental, addon_coaching, yoco_payment_id: mockYocoId
        }),
        sendGuestConfirmationEmail({
          guest_email, guest_name: guest_name || "Golfer", guest_phone,
          booking_date, start_time, duration_hours: durationNum, player_count,
          simulator_id: assignedSimulatorId, total_price: dbTotalPrice,
          amount_paid: 0, addon_club_rental, addon_coaching
        })
      ]);

      return Response.json({ 
        checkoutUrl: `${origin}/booking/success?bookingId=${booking.id}&mock=true`, 
        yocoId: mockYocoId 
      });
    }

    // --- ACTUAL YOCO CHECKOUT ---
    
    // 1. Minimum Amount Rule: Yoco rejects any transaction < R2.00 (200 cents).
    const amountInCents = Math.round(amountToCharge * 100);
    if (amountInCents < 200) {
      console.log(`[YOCO SKIPPED] Amount R${amountToCharge} is below Yoco's R2.00 minimum. Converting to walk-in/deposit.`);
      
      const emailProps = {
        guest_email, guest_name: guest_name || "Golfer", booking_date, start_time,
        duration_hours: durationNum, player_count, simulator_id: assignedSimulatorId,
        total_price: dbTotalPrice, amount_paid: 0, addon_club_rental, addon_coaching
      };

      await Promise.allSettled([
        sendStoreReceiptEmail(emailProps),
        sendGuestConfirmationEmail(emailProps)
      ]);

      return Response.json({ free_booking: true, booking_id: booking.id, assigned_bay: assignedSimulatorId, bypass_reason: "below_minimum" });
    }

    // 2. Secret Key Format Validation
    if (!yocoSecret.startsWith('sk_live_') && !yocoSecret.startsWith('sk_test_')) {
      throw new Error(`Invalid Yoco Key Format: Must start with sk_live_ or sk_test_`);
    }

    // 3. Fire Checkout (origin already resolved above)
    const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${yocoSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: "ZAR",
        cancelUrl: `${origin}/booking?cancelled=true&reference=${booking.id}`,
        successUrl: `${origin}/booking/success?bookingId=${booking.id}`,
        failureUrl: `${origin}/booking?error=payment_failed&reference=${booking.id}`,
        metadata: { booking_id: booking.id },
      }),
    })

    // 4. Raw Error Exposure & Ghost Cleanup
    if (!yocoResponse.ok) {
      const errorBody = await yocoResponse.text();
      console.error("[YOCO_CRITICAL_FAILURE]", { status: yocoResponse.status, body: errorBody });
      
      // Ghost Cleanup: nuke the pending record so it doesn't pollute the dashboard
      await supabaseAdmin.from('bookings').delete().eq('id', booking.id);
      
      return Response.json({ 
        error: 'Yoco checkout API failure', 
        status: yocoResponse.status,
        details: errorBody 
      }, { status: 500 });
    }

    // 6. Checkout ID Capture
    const yocoData = await yocoResponse.json();
    
    // Capture Yoco ID and update DB before redirect
    await supabaseAdmin
      .from('bookings')
      .update({ yoco_payment_id: yocoData.id })
      .eq('id', booking.id);

    return Response.json({ 
      checkoutUrl: yocoData.redirectUrl, 
      yocoId: yocoData.id,
      booking_id: booking.id 
    });

  } catch (error: any) {
    logEvent("initialize_error", { error: error.message }, "error")
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}