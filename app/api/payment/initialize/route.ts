import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCorrelationId, logEvent, validateEnvVars } from "@/lib/utils"

// 1. Force Edge Runtime
export const runtime = "edge"

// Helper: Calculate text end time
function calculateEndTimeText(start: string, duration: number): string {
  const [hours, minutes] = start.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  date.setHours(date.getHours() + duration)
  return date.toTimeString().slice(0, 5)
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const idempotencyKey = request.headers.get("x-idempotency-key")

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
      return NextResponse.json(
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
      pay_full_amount
    } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

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
    // 3. ROBUST DATE CALCULATION (Literal Storage)
    // ---------------------------------------------------------
    // The DB stores slot_start/end as timestamp with time zone, but Supabase UI reads them as UTC.
    // If we pass a proper ISO with +02:00, Supabase UI strips 2 hours.
    // To prevent this specifically, we give Postgres local time *without* the offset,
    // so it treats the input literally as the local time shown.

    const cleanTime = (start_time || "").length === 5 ? `${start_time}:00` : start_time;
    // Format: YYYY-MM-DDTHH:mm:SS (no Z, no offset!)
    const localStartStr = `${booking_date}T${cleanTime}`;

    // We still use JS Date to add hours cleanly
    // JS Date will assume this localStartStr is in the server's local timezone.
    const durationNum = Number(duration_hours);
    const startDate = new Date(localStartStr);

    if (isNaN(startDate.getTime()) || isNaN(durationNum)) {
      console.error("Invalid Date/Duration", { localStartStr, duration_hours });
      return NextResponse.json({
        error: "Invalid date or duration format",
        error_code: "INVALID_DATE",
        correlation_id: correlationId
      }, { status: 400 });
    }

    const endDate = new Date(startDate.getTime() + (durationNum * 60 * 60 * 1000));

    // Pad function for manual ISO rebuilding
    const pad = (n: number) => n.toString().padStart(2, '0');

    // Build literal strings formatted precisely for Postgres
    // This forcibly prevents Postgres from doing UTC math
    const slotStartLiteral = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}T${pad(startDate.getHours())}:${pad(startDate.getMinutes())}:00`;
    const slotEndLiteral = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;

    // Calculate text display time (SAST based)
    const endTimeText = calculateEndTimeText(start_time, durationNum);

    logEvent("date_debug", {
      correlationId,
      slotStartLiteral,
      slotEndLiteral,
      durationNum
    });

    // ---------------------------------------------------------
    // 3b. MULTI-BAY ASSIGNMENT LOGIC (With Ghost Cleanup)
    // ---------------------------------------------------------

    // Use the robustly calculated literal times for availability checking
    const requestedStartStr = slotStartLiteral;
    const requestedEndStr = slotEndLiteral;

    // CRITICAL FIX: Fetch simulator inventory from DB (source of truth)
    const { data: simulators, error: simError } = await supabase
      .from("simulators")
      .select("id")
      .order("id", { ascending: true })

    if (simError) {
      logEvent("simulator_fetch_error", { correlationId, error: simError.message }, "error")
    }

    // Fallback to [1, 2, 3] if no simulators table exists (backward compatibility)
    const simulatorIds = simulators?.length ? simulators.map(s => s.id) : [1, 2, 3]
    logEvent("simulators_loaded", { correlationId, simulatorIds, fromDb: !!simulators?.length })

    // SURGICAL FIX: Fetch ALL bookings for the date — INCLUDING cancelled ones.
    // The PostgreSQL exclusion constraint has no WHERE clause, so cancelled rows
    // still physically block slot inserts. We MUST fetch them to delete them.
    const { data: dailyBookings } = await supabase
      .from("bookings")
      .select("id, simulator_id, slot_start, slot_end, status, created_at, yoco_payment_id, payment_status")
      .eq("booking_date", booking_date)

    const takenBays = new Set<number>();
    const now = Date.now();
    const deleteIds: string[] = [];

    if (dailyBookings) {
      dailyBookings.forEach(b => {
        // --- GHOST / DEAD ROW CLASSIFICATION ---
        // A row should be DELETED from the DB if:
        //   1. It is already cancelled (frees exclusion constraint lock)
        //   2. It is pending with no yoco_payment_id (user never reached payment)
        //   3. It is pending with yoco_payment_id but older than 5 mins (abandoned checkout)
        // A row is ACTIVE (blocks the bay) only if it is confirmed or a fresh pending checkout.

        if (b.status === 'cancelled') {
          // Already cancelled — delete to free the exclusion constraint
          deleteIds.push(b.id);
          return; // skip to next
        }

        if (b.status === 'pending') {
          const createdTime = new Date(b.created_at).getTime();
          const ageMs = now - createdTime;

          // No yoco_payment_id = user never even got to Yoco — definitely a ghost
          if (!b.yoco_payment_id) {
            deleteIds.push(b.id);
            return;
          }
          // Has yoco_payment_id but older than 5 mins and still pending = abandoned
          if (ageMs > 300000) { // 5 mins
            deleteIds.push(b.id);
            return;
          }
        }

        // This row is ACTIVE — check if it overlaps with the requested slot
        const bStart = new Date(b.slot_start).getTime();
        const bEnd = new Date(b.slot_end).getTime();
        const reqStart = new Date(requestedStartStr).getTime();
        const reqEnd = new Date(requestedEndStr).getTime();

        const isOverlapping = (bStart < reqEnd) && (bEnd > reqStart);

        if (isOverlapping) {
          takenBays.add(b.simulator_id);
        }
      });
    }

    // HARD DELETE all ghost/cancelled rows to free exclusion constraint locks
    if (deleteIds.length > 0) {
      logEvent("ghost_cleanup", { correlationId, action: "hard_delete", deleteIds, count: deleteIds.length })
      const { error: deleteError } = await supabase
        .from("bookings")
        .delete()
        .in("id", deleteIds)

      if (deleteError) {
        logEvent("ghost_cleanup_error", { correlationId, error: deleteError.message }, "error")
      }
    }

    // CRITICAL FIX: Use actual simulator IDs from DB, not hardcoded 1/2/3
    let assignedSimulatorId = 0
    for (const id of simulatorIds) {
      if (!takenBays.has(id)) {
        assignedSimulatorId = id
        break
      }
    }

    if (assignedSimulatorId === 0) {
      logEvent("slot_unavailable", { correlationId, booking_date, start_time, takenBays: Array.from(takenBays) }, "warn")
      return NextResponse.json(
        {
          error: "Sorry, all bays are full for this time slot.",
          error_code: "SLOT_UNAVAILABLE",
          correlation_id: correlationId,
          debug: { takenBays: Array.from(takenBays), simulatorIds, deletedGhosts: deleteIds.length }
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

    // Generate or reuse idempotency key
    const bookingRequestId = body.booking_request_id || idempotencyKey || crypto.randomUUID()

    // A. IDEMPOTENCY CHECK: If this request ID was already processed, return existing booking
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
          deletedGhosts: deleteIds.length
        }, "error")

        // Handle FK violations (simulator doesn't exist)
        if (bookingError.code === "23503") {
          return NextResponse.json({
            error: "Invalid simulator configuration. Please contact support.",
            error_code: "SIMULATOR_FK_VIOLATION",
            correlation_id: correlationId,
            debug_error: bookingError.message
          }, { status: 500 })
        }

        // Handle constraint violations (race condition - slot taken)
        if (bookingError.code === '23P01' || bookingError.message?.includes('exclusion constraint')) {
          return NextResponse.json({
            error: "This time slot was just booked by another customer. Please select a different time.",
            error_code: "SLOT_RACE_CONDITION",
            correlation_id: correlationId,
            debug_error: bookingError.message,
            debug: { assignedSimulatorId, deletedGhosts: deleteIds.length }
          }, { status: 409 })
        }

        // Handle unique constraint on booking_request_id (concurrent duplicate)
        if (bookingError.code === '23505' && bookingError.message?.includes('booking_request_id')) {
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
          return NextResponse.json(
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
      return NextResponse.json({
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
      return NextResponse.json({
        error: "Payment initialization failed",
        error_code: "YOCO_CHECKOUT_FAILED",
        correlation_id: correlationId
      }, { status: 500 })
    }

    return NextResponse.json({
      redirectUrl: yocoData.redirectUrl,
      booking_id: booking.id,
    })

  } catch (error: any) {
    logEvent("booking_initialize_error", { correlationId, error: error.message }, "error")
    return NextResponse.json(
      { error: error.message || "Internal server error", error_code: "INTERNAL_ERROR", correlation_id: correlationId },
      { status: 500 }
    )
  }
}
