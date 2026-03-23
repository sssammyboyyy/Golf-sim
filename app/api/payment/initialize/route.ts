export const dynamic = "force-dynamic"

import { createClient } from "@supabase/supabase-js"
import { getCorrelationId, logEvent, validateEnvVars } from "@/lib/logger"
import { getSupabaseAdmin } from "@/lib/supabase/client"

import { getOperatingHours } from "@/lib/schedule-config"

// Helper: Calculate text end time
function calculateEndTimeText(start: string, duration: number): string {
  const [hours, minutes] = start.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  date.setHours(date.getHours() + duration)
  return date.toTimeString().slice(0, 5)
}

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request)
  const idempotencyKey = (request as any).headers.get("x-idempotency-key")

  logEvent("booking_initialize_start", { correlationId, idempotencyKey })

  try {
    // Validate required environment variables
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

    // Standard client for reads and inserts (anon key — RLS allows these)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Admin client for ghost cleanup and system tasks
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

        // ADMIN BYPASS
        if (cleanCouponCode === "MULLIGAN_ADMIN_100") {
          dbTotalPrice = Number(base_price)
          dbPaymentStatus = "paid_instore"
          dbStatus = "confirmed"
          skipYoco = true
        }
        // 100% DISCOUNT
        else if (couponData.discount_percent === 100) {
          dbTotalPrice = 0
          dbPaymentStatus = "completed"
          dbStatus = "confirmed"
          skipYoco = true
        }
        // PERCENTAGE DISCOUNT
        else if (couponData.discount_percent > 0) {
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
    // 3. ROBUST DATE CALCULATION (Explicit SAST +02:00)
    // ---------------------------------------------------------
    // Cloudflare Workers run in UTC, and Supabase stores timestamp with time zone.
    // To prevent any timezone shifting, we explicitly append the South African Standard Time
    // offset (+02:00) to the requested times. This forces both Javascript and Postgres
    // to interpret the exact same moment in time, regardless of the runtime environment.

    const cleanTime = (start_time || "").length === 5 ? `${start_time}:00` : start_time;
    // Format: YYYY-MM-DDTHH:mm:SS+02:00
    const sastStartIso = `${booking_date}T${cleanTime}+02:00`;

    const durationNum = Number(duration_hours);
    const startDate = new Date(sastStartIso);

    if (isNaN(startDate.getTime()) || isNaN(durationNum)) {
      console.error("Invalid Date/Duration", { sastStartIso, duration_hours });
      return Response.json({
        error: "Invalid date or duration format",
        error_code: "INVALID_DATE",
        correlation_id: correlationId
      }, { status: 400 });
    }

    const endDate = new Date(startDate.getTime() + (durationNum * 60 * 60 * 1000));

    // --- HARD CLOSE VALIDATION ---
    // Ensure the session does not extend past the venue's closing time.
    const operatingHours = getOperatingHours(startDate);
    if (operatingHours) {
      // SAST-safe close time (ignores server local time)
      const closeIso = `${booking_date}T${operatingHours.close.toString().padStart(2, '0')}:00:00+02:00`;
      const closeTimeMs = new Date(closeIso).getTime();

      // We use <= because 20:00 means the LAST session must END by 20:00
      if (endDate.getTime() > closeTimeMs) {
        const readableClose = `${operatingHours.close}:00`;
        return Response.json({
          error: `The venue closes at ${readableClose}. Please shorten your session or choose an earlier slot.`,
          error_code: "PAST_CLOSING_TIME",
          correlation_id: correlationId
        }, { status: 400 });
      }
    }

    // For inserts, we use proper ISO strings. Postgres handles these perfectly because
    // they represent exact moments in time, resolving all DST/UTC discrepancies.
    const slotStartLiteral = sastStartIso;

    // Construct the end time with the exact same +02:00 formatter to keep it readable in the DB
    const pad = (n: number) => n.toString().padStart(2, '0');
    // We cannot use endDate.getHours() because Cloudflare is UTC.
    // Instead, we just take the JS timestamp string in ISO and replace the Z with +02:00 math if we wanted to,
    // BUT we can just let toISOString() handle it for Supabase since it's a confirmed absolute point in time.
    // Supabase will automatically format the output as +02 when requested.
    const slotEndLiteral = endDate.toISOString();

    const endTimeText = calculateEndTimeText(start_time, durationNum);

    logEvent("date_debug", {
      correlationId,
      sastStartIso,
      slotStartLiteral,
      slotEndLiteral,
      durationNum
    });

    // ---------------------------------------------------------
    // 3b. MULTI-BAY ASSIGNMENT LOGIC (With Ghost Cleanup)
    // ---------------------------------------------------------
    // Absolute Unix timestamps for perfect math against DB
    const reqStartMs = startDate.getTime()
    const reqEndMs = endDate.getTime()

    // ---------------------------------------------------------
    // 3c. IDEMPOTENCY FIREWALL SETUP
    // ---------------------------------------------------------
    // Generate the ID early so we don't accidentally block ourselves
    // if the user double-clicks or retries a bypassed checkout
    const bookingRequestId = body.booking_request_id || idempotencyKey || crypto.randomUUID()

    // Fetch simulator inventory from DB
    const { data: simulators, error: simError } = await supabase
      .from("simulators")
      .select("id")
      .order("id", { ascending: true })

    if (simError) {
      logEvent("simulator_fetch_error", { correlationId, error: simError.message }, "error")
    }

    const simulatorIds = simulators?.length ? simulators.map(s => s.id) : [1, 2, 3]
    logEvent("simulators_loaded", { correlationId, simulatorIds, fromDb: !!simulators?.length })

    // Fetch ALL bookings for the date — INCLUDING cancelled ones.
    // The PostgreSQL exclusion constraint has no WHERE clause, so cancelled rows
    // still physically block slot inserts. We MUST fetch them to delete them.
    const { data: dailyBookings } = await supabaseAdmin
      .from("bookings")
      .select("id, simulator_id, start_time, slot_start, slot_end, status, created_at, yoco_payment_id, booking_request_id, guest_email")
      .eq("booking_date", booking_date)

    const takenBays = new Set<number>();
    const now = Date.now();
    const ghostDeleteIds: string[] = [];

    if (dailyBookings) {
      dailyBookings.forEach(b => {
        // --- GHOST / DEAD ROW CLASSIFICATION ---
        // A row is a "ghost" and should be DELETED if it's an abandoned PENDING booking.
        // A CANCELLED booking is a valid historical record and is NOT a ghost.
        let isGhost = false;
        if (b.status === 'pending') {
          const createdTime = new Date(b.created_at).getTime();
          const ageMs = now - createdTime;

          // Abandoned if pending for > 5 mins, OR pending without ever starting payment.
          if (ageMs > 300000 || !b.yoco_payment_id) {
            isGhost = true;
            ghostDeleteIds.push(b.id);
          }
        }

        // If it's a ghost or already cancelled, it doesn't occupy a slot.
        if (isGhost || b.status === 'cancelled') {
          return;
        }


        // --- IDEMPOTENCY / SELF-RECOVERY FIREWALL ---
        // A row DOES NOT block us if:
        // 1. It matches our specific transient booking_request_id (double-click/retry)
        // 2. OR it belongs to our SAME EMAIL for the SAME START TIME (page refresh recovery)
        const isSelfRecovery = (b.guest_email === guest_email && b.start_time === start_time && b.status === 'confirmed');

        if (b.booking_request_id === bookingRequestId || isSelfRecovery) {
          return;
        }

        // This row is ACTIVE — check if it overlaps with the requested slot
        const bStart = new Date(b.slot_start).getTime();
        const bEnd = new Date(b.slot_end).getTime();

        const isOverlapping = (bStart < reqEndMs) && (bEnd > reqStartMs);

        if (isOverlapping) {
          takenBays.add(b.simulator_id);
        }
      });
    }

    // HARD DELETE all ghost/cancelled rows using the ADMIN client (bypasses RLS)
    if (ghostDeleteIds.length > 0) {
      logEvent("ghost_cleanup", {
        correlationId,
        action: "hard_delete_abandoned_pending",
        deleteIds: ghostDeleteIds,
        count: ghostDeleteIds.length
      })
      const { error: deleteError, count: deleteCount } = await supabaseAdmin
        .from("bookings")
        .delete({ count: 'exact' })
        .in("id", ghostDeleteIds)

      if (deleteError) {
        logEvent("ghost_cleanup_error", { correlationId, error: deleteError.message, code: deleteError.code }, "error")
      } else {
        logEvent("ghost_cleanup_success", { correlationId, requested: ghostDeleteIds.length, deleted: deleteCount })
      }
    }

    // Use actual simulator IDs from DB
    let assignedSimulatorId = 0
    for (const id of simulatorIds) {
      if (!takenBays.has(id)) {
        assignedSimulatorId = id
        break
      }
    }

    if (assignedSimulatorId === 0) {
      logEvent("slot_unavailable", { correlationId, booking_date, start_time, takenBays: Array.from(takenBays) }, "warn")
      return Response.json(
        {
          error: "Sorry, all bays are full for this time slot.",
          error_code: "SLOT_UNAVAILABLE",
          correlation_id: correlationId,
          debug: { takenBays: Array.from(takenBays), simulatorIds, deletedGhosts: ghostDeleteIds.length }
        },
        { status: 409 }
      )
    }

    logEvent("bay_assigned", { correlationId, assignedSimulatorId })

    // ---------------------------------------------------------
    // 4. DEPOSIT LOGIC (Calculate BEFORE creating booking)
    // ---------------------------------------------------------
    let amountToCharge = dbTotalPrice;
    const sessionStr = String(session_type || "").toLowerCase();
    const optionStr = String(famous_course_option || "").toLowerCase();
    const isDepositEligible = sessionStr.includes("famous") || sessionStr.includes("ball") || optionStr.includes("ball");

    if (isDepositEligible && !pay_full_amount) {
      amountToCharge = Math.ceil(dbTotalPrice * 0.40);
    }

    const outstandingBalance = dbTotalPrice - amountToCharge;


    // ---------------------------------------------------------
    // 5. CREATE DB ROW (WITH IDEMPOTENCY)
    // ---------------------------------------------------------
    // (bookingRequestId was generated above during the Active Bays check)

    // A. IDEMPOTENCY CHECK
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_request_id", bookingRequestId)
      .maybeSingle()

    let booking = existingBooking;

    // B. CREATE NEW BOOKING (only if not already existing)
    if (!booking) {
      const { data: newBooking, error: bookingError } = await supabase
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
        logEvent("booking_insert_error", {
          correlationId,
          error: bookingError.message,
          code: bookingError.code,
          assignedSimulatorId,
          slotStartLiteral,
          slotEndLiteral,
          deletedGhosts: ghostDeleteIds.length
        }, "error")

        // Handle FK violations (simulator doesn't exist)
        if (bookingError.code === "23503") {
          return Response.json({
            error: "Invalid simulator configuration. Please contact support.",
            error_code: "SIMULATOR_FK_VIOLATION",
            correlation_id: correlationId,
            debug_error: bookingError.message
          }, { status: 500 })
        }

        // Handle constraint violations (exclusion constraint — slot overlap)
        if (bookingError.code === '23P01' || bookingError.message?.includes('exclusion constraint')) {
          // RETRY ONCE: Force-delete the conflicting row on this specific simulator, then re-insert
          logEvent("exclusion_constraint_retry", { correlationId, assignedSimulatorId }, "warn")

          const { error: forceDeleteError } = await supabaseAdmin
            .from("bookings")
            .delete()
            .eq("booking_date", booking_date)
            .eq("simulator_id", assignedSimulatorId)
            .neq("status", "confirmed")

          if (!forceDeleteError) {
            // Retry the insert after force cleanup
            const { data: retryBooking, error: retryError } = await supabase
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
              logEvent("exclusion_constraint_retry_success", { correlationId, bookingId: retryBooking.id })
              booking = retryBooking
            } else {
              return Response.json({
                error: "This time slot is currently unavailable. Please select a different time.",
                error_code: "SLOT_RACE_CONDITION",
                correlation_id: correlationId,
                debug_error: retryError?.message || bookingError.message,
                debug: { assignedSimulatorId, deletedGhosts: ghostDeleteIds.length, retryFailed: true }
              }, { status: 409 })
            }
          } else {
            return Response.json({
              error: "This time slot is currently unavailable. Please select a different time.",
              error_code: "SLOT_RACE_CONDITION",
              correlation_id: correlationId,
              debug_error: bookingError.message,
              debug: { assignedSimulatorId, deletedGhosts: ghostDeleteIds.length, forceDeleteFailed: forceDeleteError.message }
            }, { status: 409 })
          }
        }

        // Handle unique constraint on booking_request_id (concurrent duplicate)
        if (!booking && bookingError.code === '23505' && bookingError.message?.includes('booking_request_id')) {
          const { data: retryBooking } = await supabase
            .from("bookings")
            .select("*")
            .eq("booking_request_id", bookingRequestId)
            .single()
          if (retryBooking) {
            booking = retryBooking
          }
        }

        if (!booking) {
          return Response.json(
            {
              error: `Booking failed: ${bookingError.message} (Code: ${bookingError.code})`,
              error_code: "BOOKING_INSERT_FAILED",
              correlation_id: correlationId,
              debug_error: bookingError.message,
              details: bookingError.details,
              hint: bookingError.hint
            },
            { status: 500 }
          )
        }
      } else {
        booking = newBooking
      }
    }

    logEvent("booking_created", { correlationId, bookingId: booking.id, simulatorId: assignedSimulatorId })

    if (skipYoco) {
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
      await supabase
        .from("bookings")
        .update({ yoco_payment_id: yocoData.id })
        .eq("id", booking.id)
    }

    if (!yocoResponse.ok) {
      logEvent("yoco_checkout_failed", { correlationId, yocoError: yocoData }, "error")
      return Response.json({
        error: "Payment initialization failed",
        error_code: "YOCO_CHECKOUT_FAILED",
        correlation_id: correlationId
      }, { status: 500 })
    }

    return Response.json({
      redirectUrl: yocoData.redirectUrl,
      booking_id: booking.id,
    })

  } catch (error: any) {
    logEvent("booking_initialize_error", { correlationId, error: error.message }, "error")
    return Response.json(
      { error: error.message || "Internal server error", error_code: "INTERNAL_ERROR", correlation_id: correlationId },
      { status: 500 }
    )
  }
}
