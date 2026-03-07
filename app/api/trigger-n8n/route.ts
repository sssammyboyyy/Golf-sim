import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCorrelationId, logEvent, validateEnvVars } from "@/lib/utils"

export const runtime = "edge"

// Bay name mapping for human-readable emails
const BAY_NAMES: Record<number, string> = {
  1: "Lounge Bay",
  2: "Middle Bay",
  3: "Window Bay"
}

function getBayName(simulatorId: number | null): string {
  if (!simulatorId) return "Unassigned"
  return BAY_NAMES[simulatorId] || `Bay ${simulatorId}`
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)

  try {
    // CRITICAL FIX: Validate required env vars
    const envCheck = validateEnvVars([
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "YOCO_SECRET_KEY"
    ])
    if (envCheck) {
      logEvent("env_validation_failed", { correlationId, missing: envCheck.missing }, "error")
      return NextResponse.json(
        { success: false, error: "Server configuration error", error_code: "MISSING_ENV", correlation_id: correlationId },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      logEvent("missing_booking_id", { correlationId }, "error")
      return NextResponse.json(
        { success: false, error: "Missing Booking ID", error_code: "MISSING_BOOKING_ID", correlation_id: correlationId },
        { status: 400 }
      )
    }

    logEvent("trigger_n8n_start", { correlationId, bookingId })

    // 1. Initialize Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Fetch Booking
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    if (error || !booking) {
      logEvent("booking_not_found", { correlationId, bookingId, error: error?.message }, "error")
      return NextResponse.json(
        { success: false, error: "Booking not found", error_code: "BOOKING_NOT_FOUND", correlation_id: correlationId },
        { status: 404 }
      )
    }

    // --- 3. RACE CONDITION GUARD (CRITICAL FIX) ---
    // If we have a Yoco ID but DB says 0 paid, the Webhook hasn't fired yet.
    // We must manually verify with Yoco before sending the email.

    let dbTotal = Number(booking.total_price) || 0
    let dbPaid = Number(booking.amount_paid) || 0
    let paymentStatus = booking.payment_status

    if (booking.yoco_payment_id && dbPaid === 0) {
      console.log(`[Race Condition Detected] Checking Yoco directly for ${booking.yoco_payment_id}...`)

      try {
        const yocoRes = await fetch(`https://payments.yoco.com/api/checkouts/${booking.yoco_payment_id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY}`
          }
        })

        if (yocoRes.ok) {
          const yocoData = await yocoRes.json()
          console.log(`[Yoco Check] Status: ${yocoData.status} for ${booking.yoco_payment_id}`);

          // Terminal success states in Yoco: successful, captured, paid
          const isSuccessful = ['successful', 'captured', 'paid'].includes(yocoData.status)

          if (isSuccessful) {
            console.log("[Race Condition Resolved] Payment was successful. Updating payload.")

            // 1. Get actual paid amount from Yoco (amount is in cents)
            // Try metadata first, then fall back to Yoco's amount field
            const yocoAmount = yocoData.metadata?.depositPaid
              ? parseFloat(yocoData.metadata.depositPaid)
              : (yocoData.amount ? yocoData.amount / 100 : dbTotal)

            dbPaid = yocoAmount
            paymentStatus = "completed"

            // 2. Self-Heal the Database (Don't wait for webhook)
            // We set status to 'confirmed' immediately so UI is happy
            await supabaseAdmin
              .from("bookings")
              .update({
                amount_paid: dbPaid,
                payment_status: paymentStatus,
                status: "confirmed",
                updated_at: new Date().toISOString()
              })
              .eq("id", bookingId)
          } else {
            console.log(`[Yoco Check] Status ${yocoData.status} is not successful. Payload stays at R0.`);
          }
        }
      } catch (yocoError) {
        console.error("Yoco Verification Failed:", yocoError)
      }
    }
    // ----------------------------------------------

    const outstanding = dbTotal - dbPaid
    const isShortSession = (booking.duration_hours || 0) <= 1;

    // Determine payment type intelligently
    let paymentType = "manual";
    if (dbPaid > 0) {
      paymentType = outstanding > 0 ? "deposit" : "full";
    } else if (booking.yoco_payment_id) {
      paymentType = "online_pending"; // Should have been paid but system says 0
    }

    // 4. Prepare Payload for n8n (ENHANCED for store clarity)
    const payload = {
      secret: process.env.N8N_SECRET || "mulligan-secure-8821",
      bookingId: booking.id,
      yocoId: booking.yoco_payment_id || "manual",
      paymentStatus: paymentStatus,

      // Guest Info
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone,

      // Booking Details
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      simulator_id: booking.simulator_id,

      // Human-readable fields for store emails
      bay_name: getBayName(booking.simulator_id),
      time_slot: `${(booking.start_time || "").slice(0, 5)} - ${(booking.end_time || "").slice(0, 5)}`,

      // Session Details
      player_count: booking.player_count || 1,
      duration_hours: booking.duration_hours || 1,
      is_short_session: isShortSession,
      session_type: booking.session_type || "quick",
      session_type_label: booking.session_type === "famous-course" ? "Famous Course" : "Quick Play",

      // Financials (Clear breakdown)
      total_price: dbTotal.toFixed(2),
      amount_paid: dbPaid.toFixed(2),
      amount_due: outstanding.toFixed(2),

      // Payment Clarity
      payment_type: paymentType,
      is_fully_paid: outstanding === 0,
      payment_summary: dbPaid > 0
        ? (outstanding > 0
          ? `Deposit: R${dbPaid.toFixed(2)} | Balance Due: R${outstanding.toFixed(2)}`
          : `Paid in Full: R${dbTotal.toFixed(2)}`)
        : (booking.yoco_payment_id ? "Online Payment Pending/Failed" : "Manual Payment Expected"),

      // Add-ons (bookable via website UI)
      addon_coaching: booking.addon_coaching || false,
      addon_club_rental: booking.addon_club_rental || false,

      // Legacy Support (for backward compatibility)
      totalPrice: dbTotal.toFixed(2),
      depositPaid: dbPaid.toFixed(2),
      outstandingBalance: outstanding.toFixed(2)
    }


    // --- 5. EMAIL FILTERING ---
    const email = booking.guest_email || "";
    // Basic format check & specific exclusion of the dummy walk-in domain
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isMockEmail = email.includes("venue-os.com");

    if (!isValidEmail || isMockEmail) {
      console.log(`[Trigger Skipped] Invalid or Mock Email: ${email}`);
      return NextResponse.json({ success: true, skipped: true, reason: "Invalid/Mock Email" });
    }

    // 6. Send to n8n
    const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.srv1127912.hstgr.cloud/webhook/manual-confirm"

    let n8nStatus = "pending";
    let n8nText = "";

    try {
      console.log(`[API] Sending to n8n: ${n8nUrl}`);
      const n8nRes = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      n8nStatus = n8nRes.status.toString();
      n8nText = await n8nRes.text();
      console.log(`[API] n8n Response: ${n8nStatus} - ${n8nText}`);

    } catch (err: any) {
      console.error("n8n Trigger Error:", err);
      n8nStatus = "error";
      n8nText = err.message;
    }

    // CRITICAL FIX: Return actual success status based on n8n response (Must be 2xx)
    const isSuccess = n8nStatus.startsWith("2")

    // --- 7. UPDATE N8N TRACKING IN DB ---
    // Update the booking row with the result of this attempt
    await supabaseAdmin
      .from("bookings")
      .update({
        n8n_status: isSuccess ? 'sent' : 'error',
        n8n_response: n8nText.slice(0, 1000), // Truncate to avoid overflow
        n8n_last_attempt_at: new Date().toISOString()
      })
      .eq("id", bookingId)

    logEvent("trigger_n8n_complete", {
      correlationId,
      bookingId,
      success: isSuccess,
      n8nStatus,
      fixedRaceCondition: dbPaid > 0 && booking.amount_paid === 0
    })

    return NextResponse.json({
      success: isSuccess,
      fixed_race_condition: dbPaid > 0 && booking.amount_paid === 0,
      debug_target: n8nUrl,
      n8n_status: n8nStatus,
      n8n_response: n8nText,
      correlation_id: correlationId,
      // Include message for client error handling
      message: isSuccess ? "Confirmation sent" : "Confirmation delivery failed. Please contact support."
    })

  } catch (error: any) {
    logEvent("trigger_n8n_error", { correlationId, error: error.message }, "error")
    return NextResponse.json(
      { success: false, error: error.message, error_code: "TRIGGER_ERROR", correlation_id: correlationId },
      { status: 500 }
    )
  }
}
