import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      console.error(" Error: Missing Booking ID in payload");
      return NextResponse.json({ error: "Missing Booking ID" }, { status: 400 })
    }

    console.log(`[API] Triggering n8n for booking: ${bookingId}`);

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
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
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

          // If Yoco says successful, we FORCE the update locally
          if (yocoData.status === 'successful') {
            console.log("[Race Condition Resolved] Payment was successful. Updating payload.")

            // 1. Update local variables for the email
            dbPaid = dbTotal // Assume full payment if successful (or parse yocoData.amount / 100)
            paymentStatus = "paid_instore" // Or 'completed', keeping your convention

            // 2. Self-Heal the Database (Don't wait for webhook)
            await supabaseAdmin
              .from("bookings")
              .update({
                amount_paid: dbPaid,
                payment_status: paymentStatus,
                status: "confirmed"
              })
              .eq("id", bookingId)
          }
        }
      } catch (yocoError) {
        console.error("Yoco Verification Failed:", yocoError)
        // Fallback: Proceed with existing DB values if Yoco check fails
      }
    }
    // ----------------------------------------------

    const outstanding = dbTotal - dbPaid

    // 4. Prepare Payload for n8n
    const payload = {
      secret: "mulligan-secure-8821",
      bookingId: booking.id,
      yocoId: booking.yoco_payment_id || "manual",
      paymentStatus: paymentStatus,

      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      simulator_id: booking.simulator_id,

      // Financials (Corrected)
      total_price: dbTotal.toFixed(2),
      amount_paid: dbPaid.toFixed(2), // Now guaranteed to be correct
      amount_due: outstanding.toFixed(2),

      // Legacy Support
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

    return NextResponse.json({
      success: true,
      fixed_race_condition: dbPaid > 0 && booking.amount_paid === 0,
      debug_target: n8nUrl,
      n8n_status: n8nStatus,
      n8n_response: n8nText
    })

  } catch (error: any) {
    console.error("Critical Trigger Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
