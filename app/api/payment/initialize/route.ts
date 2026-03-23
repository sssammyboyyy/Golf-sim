export const dynamic = "force-dynamic"

import { createClient } from "@supabase/supabase-js"
import { getCorrelationId, logEvent, validateEnvVars } from "@/lib/logger"
import { getSupabaseAdmin } from "@/lib/supabase/client"
import { getOperatingHours } from "@/lib/schedule-config"
import { Resend } from "resend"

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
  if (/([+-]\d{2})$/.test(safeStr)) {
    safeStr += ':00';
  }
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
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "YOCO_SECRET_KEY"
    ])
    if (envCheck) {
      logEvent("env_validation_failed", { correlationId, missing: envCheck.missing }, "error")
      return Response.json(
        { error: "Server configuration error", error_code: "MISSING_ENV", correlation_id: correlationId },
        { status: 500 }
      )
    }

    const body = await request.json()

    // --- MAPPING VARIABLES ---
    const booking_date = body.booking_date || body.date
    const start_time = body.start_time || body.timeSlot
    const duration_hours = body.duration_hours || body.duration
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Admin client for bypasses
    const supabaseAdmin = getSupabaseAdmin()

    // ---------------------------------------------------------
    // 2. ROBUST COUPON & PRICE LOGIC
    // ---------------------------------------------------------
    let dbTotalPrice = Number(total_price)
    let dbPaymentStatus = "pending"
    let dbStatus = "pending"
    let skipYoco = false
    let couponApplied = null

    const cleanCouponCode = coupon_code ? String(coupon_code).trim().toUpperCase() : null

    if (cleanCouponCode && cleanCouponCode.length > 0) {
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", cleanCouponCode)
        .eq("is_active", true)
        .single()

      if (couponData) {
        couponApplied = cleanCouponCode
        if (cleanCouponCode === "MULLIGAN_ADMIN_100") {
          dbTotalPrice = Number(base_price)
          dbPaymentStatus = "paid_instore"
          dbStatus = "confirmed"
          skipYoco = true
        } else if (couponData.discount_percent === 100) {
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

    if (dbTotalPrice === 0 && !skipYoco) {
      dbPaymentStatus = "completed"
      dbStatus = "confirmed"
      skipYoco = true
    }

    // ---------------------------------------------------------
    // 3. ROBUST DATE CALCULATION
    // ---------------------------------------------------------
    const cleanTime = (start_time || "").length === 5 ? `${start_time}:00` : start_time;
    const sastStartIso = `${booking_date}T${cleanTime}+02:00`;
    const durationNum = Number(duration_hours);
    const startDate = new Date(sastStartIso);

    if (isNaN(startDate.getTime()) || isNaN(durationNum)) {
      return Response.json({
        error: "Invalid date or duration format",
        error_code: "INVALID_DATE",
        correlation_id: correlationId
      }, { status: 400 });
    }

    const endDate = new Date(startDate.getTime() + (durationNum * 60 * 60 * 1000));

    const operatingHours = getOperatingHours(startDate);
    if (operatingHours) {
      const closeIso = `${booking_date}T${operatingHours.close.toString().padStart(2, '0')}:00:00+02:00`;
      const closeTimeMs = new Date(closeIso).getTime();
      if (endDate.getTime() > closeTimeMs) {
        return Response.json({
          error: `The venue closes at ${operatingHours.close}:00. Please shorten your session.`,
          error_code: "PAST_CLOSING_TIME",
          correlation_id: correlationId
        }, { status: 400 });
      }
    }

    const slotStartLiteral = sastStartIso;
    const slotEndLiteral = endDate.toISOString();
    const endTimeText = calculateEndTimeText(start_time, durationNum);

    const reqStartMs = startDate.getTime()
    const reqEndMs = endDate.getTime()
    const bookingRequestId = body.booking_request_id || idempotencyKey || crypto.randomUUID()

    const { data: simulators } = await supabase.from("simulators").select("id").order("id", { ascending: true })
    const simulatorIds = simulators?.length ? simulators.map(s => s.id) : [1, 2, 3]

    const { data: dailyBookings } = await supabaseAdmin
      .from("bookings")
      .select("id, simulator_id, start_time, slot_start, slot_end, status, created_at, yoco_payment_id, booking_request_id, guest_email")
      .eq("booking_date", booking_date)

    const takenBays = new Set<number>();
    const now = Date.now();
    const ghostDeleteIds: string[] = [];

    if (dailyBookings) {
      dailyBookings.forEach(b => {
        let isGhost = false;
        if (b.status === 'pending') {
          const createdTime = parsePgDate(b.created_at);
          const ageMs = now - createdTime;
          // Ghost patch: Only delete if actually old (5 mins)
          if (ageMs > 300000) {
            isGhost = true;
            ghostDeleteIds.push(b.id);
          }
        }

        if (isGhost || b.status === 'cancelled') return;

        const isSelfRecovery = (b.guest_email === guest_email && b.start_time === start_time && b.status === 'confirmed');
        if (b.booking_request_id === bookingRequestId || isSelfRecovery) return;

        // Date parse patch used here
        const bStart = parsePgDate(b.slot_start);
        const bEnd = parsePgDate(b.slot_end);
        const isOverlapping = (bStart < reqEndMs) && (bEnd > reqStartMs);

        if (isOverlapping) takenBays.add(b.simulator_id);
      });
    }

    if (ghostDeleteIds.length > 0) {
      await supabaseAdmin.from("bookings").delete({ count: 'exact' }).in("id", ghostDeleteIds)
    }

    let assignedSimulatorId = 0
    for (const id of simulatorIds) {
      if (!takenBays.has(id)) {
        assignedSimulatorId = id
        break
      }
    }

    if (assignedSimulatorId === 0) {
      return Response.json(
        {
          error: "Sorry, all bays are full for this time slot.",
          error_code: "SLOT_UNAVAILABLE",
          correlation_id: correlationId
        },
        { status: 409 }
      )
    }

    // ---------------------------------------------------------
    // 4. DEPOSIT LOGIC 
    // ---------------------------------------------------------
    let amountToCharge = dbTotalPrice;
    const sessionStr = String(session_type || "").toLowerCase();
    const optionStr = String(famous_course_option || "").toLowerCase();
    const isDepositEligible = sessionStr.includes("famous") || sessionStr.includes("ball") || optionStr.includes("ball");

    if (isDepositEligible && !pay_full_amount) amountToCharge = Math.ceil(dbTotalPrice * 0.40);
    const outstandingBalance = dbTotalPrice - amountToCharge;

    // ---------------------------------------------------------
    // 5. CREATE DB ROW (SupabaseAdmin applied)
    // ---------------------------------------------------------
    const { data: existingBooking } = await supabase.from("bookings").select("*").eq("booking_request_id", bookingRequestId).maybeSingle()
    let booking = existingBooking;

    if (!booking) {
      const { data: newBooking, error: bookingError } = await supabaseAdmin // Admin Bypass
        .from("bookings")
        .insert({
          booking_request_id: bookingRequestId,
          booking_date,
          start_time,
          end_time: endTimeText,
          slot_start: slotStartLiteral,
          slot_end: slotEndLiteral,
          duration_hours,
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

      if (bookingError) {
        if (bookingError.code === "23503") {
          return Response.json({ error: "Invalid simulator configuration.", error_code: "SIMULATOR_FK_VIOLATION", correlation_id: correlationId }, { status: 500 })
        }

        if (bookingError.code === '23P01' || bookingError.message?.includes('exclusion constraint')) {
          const { error: forceDeleteError } = await supabaseAdmin.from("bookings").delete().eq("booking_date", booking_date).eq("simulator_id", assignedSimulatorId).neq("status", "confirmed")

          if (!forceDeleteError) {
            const { data: retryBooking, error: retryError } = await supabaseAdmin // Admin Bypass
              .from("bookings")
              .insert({
                booking_request_id: bookingRequestId,
                booking_date,
                start_time,
                end_time: endTimeText,
                slot_start: slotStartLiteral,
                slot_end: slotEndLiteral,
                duration_hours,
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

            if (retryBooking && !retryError) {
              booking = retryBooking
            } else {
              return Response.json({ error: "This time slot is currently unavailable.", error_code: "SLOT_RACE_CONDITION", correlation_id: correlationId }, { status: 409 })
            }
          } else {
            return Response.json({ error: "This time slot is currently unavailable.", error_code: "SLOT_RACE_CONDITION", correlation_id: correlationId }, { status: 409 })
          }
        }

        if (!booking && bookingError.code === '23505' && bookingError.message?.includes('booking_request_id')) {
          const { data: retryBooking } = await supabase.from("bookings").select("*").eq("booking_request_id", bookingRequestId).single()
          if (retryBooking) booking = retryBooking
        }

        if (!booking) {
          return Response.json({ error: `Booking failed: ${bookingError.message}`, error_code: "BOOKING_INSERT_FAILED", correlation_id: correlationId }, { status: 500 })
        }
      } else {
        booking = newBooking
      }
    }

    // ---------------------------------------------------------
    // FREE TIER / BYPASS EMAIL DISPATCH
    // ---------------------------------------------------------
    if (skipYoco) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');
        const guestName = guest_name || "Golfer";
        const bayName = assignedSimulatorId === 1 ? "Lounge Bay" : assignedSimulatorId === 2 ? "Middle Bay" : "Window Bay";
        const needsClubs = (addon_club_rental === true || String(addon_club_rental).toLowerCase() === 'true');
        const needsCoaching = (addon_coaching === true || String(addon_coaching).toLowerCase() === 'true');

        let addOnsHtml = '';
        if (needsClubs || needsCoaching) {
          addOnsHtml = `<div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:24px;margin-bottom:32px;"><span style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin-bottom:15px;display:block;">✨ Selected Add-ons</span><table style="width:100%;border-collapse:collapse;">${needsClubs ? '<tr><td style="padding:8px 0;font-size:14px;color:#92400e;">Club Rental / Hire</td><td style="padding:8px 0;font-size:14px;color:#92400e;text-align:right;font-weight:600;">Included</td></tr>' : ''}${needsCoaching ? '<tr><td style="padding:8px 0;font-size:14px;color:#92400e;">Coaching Session</td><td style="padding:8px 0;font-size:14px;color:#92400e;text-align:right;font-weight:600;">Included</td></tr>' : ''}</table></div>`;
        }

        if (guest_email && !guest_email.toLowerCase().includes('walkin@venue-os.com')) {
          await resend.emails.send({
            from: "The Mulligan <bookings@themulligan.org>",
            to: guest_email,
            subject: "Booking Confirmed - The Mulligan",
            html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.5;"><div style="background-color:#1a472a;background-image:linear-gradient(135deg,#1a472a 0%,#0d2a19 100%);padding:60px 40px;text-align:center;border-radius:12px 12px 0 0;"><div style="display:inline-block;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 16px;border-radius:100px;font-size:12px;font-weight:600;margin-bottom:20px;">SESSION CONFIRMED</div><p style="color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;margin:0 0 8px;">The Mulligan</p><p style="color:#fbbf24;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:0 0 30px;opacity:0.9;">The Simulator Never Judges</p><h1 style="color:#fff;font-size:32px;font-weight:700;margin:0;line-height:1.2;">You're Teeing Off!</h1><p style="color:#a3d9a5;font-size:16px;margin:12px 0 0;opacity:0.8;">See you on the green, ${guestName}.</p></div><div style="padding:40px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background-color:#ffffff;"><p style="font-size:18px;color:#111827;font-weight:600;margin:0 0 16px;">Exciting news, ${guestName}!</p><p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 32px;">Your booking at The Mulligan is confirmed. We've reserved ${bayName} exclusively for your group.</p><div style="background-color:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:24px;margin-bottom:32px;"><span style="font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;display:block;">BOOKING DETAILS</span><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Date</td><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${booking_date}</td></tr><tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Start Time</td><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${start_time}</td></tr><tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Duration</td><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${duration_hours} Hours</td></tr><tr><td style="padding:12px 0;font-size:14px;color:#6b7280;">Players</td><td style="padding:12px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${player_count} Players</td></tr></table></div>${addOnsHtml}<div style="background-color:#ecfdf5;border:1px solid #d1fae5;border-radius:12px;padding:24px;margin-bottom:32px;text-align:center;"><span style="font-size:13px;color:#065f46;opacity:0.7;margin-bottom:12px;display:block;font-weight:500;">PAYMENT RECEIVED</span><p style="font-size:28px;font-weight:700;color:#065f46;margin:0;">R ${dbTotalPrice.toFixed(2)}</p></div></div></div>`
          });
        }

        await resend.emails.send({
          from: "The Mulligan <alerts@themulligan.org>",
          to: "mulligan.store@gmail.com",
          subject: `BOOKING ALERT: ${guestName} (Bypass/Free)`,
          html: `<h2>New Booking Confirmed (Bypass/Free)</h2><ul><li><strong>Name:</strong> ${guestName}</li><li><strong>Bay:</strong> ${bayName}</li><li><strong>Date:</strong> ${booking_date}</li><li><strong>Time:</strong> ${start_time} for ${duration_hours} hours</li><li><strong>Players:</strong> ${player_count}</li><li><strong>Amount Paid:</strong> R ${dbTotalPrice.toFixed(2)}</li></ul>`
        });
      } catch (err: any) {
        console.error("[Free Booking Email Error]", err.message);
      }

      return Response.json({
        free_booking: true,
        booking_id: booking.id,
        message: dbPaymentStatus === "paid_instore" ? "Walk-in Confirmed" : "Booking confirmed with coupon",
      })
    }

    // ---------------------------------------------------------
    // 6. YOCO CHECKOUT
    // ---------------------------------------------------------
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.themulligan.org"

    const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amountToCharge * 100),
        currency: "ZAR",
        cancelUrl: `${appUrl}/booking?cancelled=true&reference=${booking.id}`,
        successUrl: `${appUrl}/booking/success?bookingId=${booking.id}`,
        failureUrl: `${appUrl}/booking?error=payment_failed&reference=${booking.id}`,
        metadata: {
          bookingId: booking.id,
          totalPrice: dbTotalPrice.toFixed(2),
          depositPaid: amountToCharge.toFixed(2),
          outstandingBalance: outstandingBalance.toFixed(2),
          isDeposit: (outstandingBalance > 0).toString()
        },
      }),
    })

    const yocoData = await yocoResponse.json()

    if (yocoData.id) {
      await supabaseAdmin // Admin Bypass
        .from("bookings")
        .update({ yoco_payment_id: yocoData.id })
        .eq("id", booking.id)
    }

    if (!yocoResponse.ok) {
      return Response.json({ error: "Payment initialization failed", error_code: "YOCO_CHECKOUT_FAILED", correlation_id: correlationId }, { status: 500 })
    }

    return Response.json({ redirectUrl: yocoData.redirectUrl, booking_id: booking.id })

  } catch (error: any) {
    return Response.json({ error: error.message || "Internal server error", error_code: "INTERNAL_ERROR", correlation_id: correlationId }, { status: 500 })
  }
}