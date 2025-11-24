import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      booking_date,
      start_time,
      duration_hours,
      player_count,
      session_type,
      famous_course_option,
      base_price,
      total_price, // This is the amount calculated by frontend (might be 0 if coupon applied)
      guest_name,
      guest_email,
      guest_phone,
      accept_whatsapp,
      enter_competition,
      coupon_code,
    } = body

    console.log("[v0] Creating booking with data:", { booking_date, start_time, guest_name, session_type, coupon_code })

    const supabase = await createClient()

    // --- REVENUE LOGIC START ---
    
    let dbTotalPrice = total_price; // Default: Save what the frontend calculated
    let dbPaymentStatus = "pending";
    let dbStatus = "pending";
    let skipYoco = false;

    // 1. Verify Coupon
    if (coupon_code) {
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", coupon_code)
        .eq("is_active", true)
        .single();

      if (couponData) {
        // CASE A: ADMIN WALK-IN (The "Revenue Preservation" Fix)
        // If it's the admin code, we want to record the FULL REVENUE, but skip online payment.
        if (couponData.code === 'MULLIGAN_ADMIN_100') {
            console.log(`[v0] Admin Walk-in detected. Recording revenue: R${base_price}, but skipping online payment.`);
            
            dbTotalPrice = base_price; // Save the FULL value (R250) for reports
            dbPaymentStatus = "paid_instore"; // Mark as paid offline
            dbStatus = "confirmed";
            skipYoco = true;
        } 
        // CASE B: GENERIC 100% OFF COUPON (e.g. Prize Winner)
        // Revenue is actually 0.
        else if (couponData.discount_percent === 100) {
            console.log(`[v0] 100% Discount detected. Recording revenue: R0.`);
            
            dbTotalPrice = 0;
            dbPaymentStatus = "completed"; // Paid by coupon
            dbStatus = "confirmed";
            skipYoco = true;
        }
      }
    }

    // Double check: If frontend sent 0 (via generic coupon logic) but we didn't catch it above
    if (total_price === 0 && !skipYoco) {
        dbPaymentStatus = "completed";
        dbStatus = "confirmed";
        skipYoco = true;
    }
    // --- REVENUE LOGIC END ---

    // Create booking in database
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_date,
        start_time,
        end_time: calculateEndTime(start_time, duration_hours),
        duration_hours,
        player_count,
        user_type: "guest",
        session_type,
        famous_course_option,
        base_price,
        total_price: dbTotalPrice, // Saving the CORRECT revenue amount
        status: dbStatus,
        payment_status: dbPaymentStatus,
        guest_name,
        guest_email,
        guest_phone,
        accept_whatsapp,
        enter_competition,
        coupon_code,
      })
      .select()
      .single()

    if (bookingError) {
      console.error("[v0] Booking creation error:", bookingError)
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
    }

    console.log("[v0] Booking created successfully:", booking.id)

    // --- WEBHOOK LOGIC (Updated for Reporting) ---
    const webhookUrl = process.env.N8N_WEBHOOK_URL
    if (webhookUrl) {
      const webhookPayload = {
        event: "booking_created",
        booking_id: booking.id,
        guest_name,
        guest_email,
        guest_phone,
        booking_date,
        start_time,
        duration_hours,
        player_count,
        session_type,
        famous_course_option,
        base_price,
        total_price: dbTotalPrice, // Sending full revenue to n8n
        payment_status: dbPaymentStatus, // Sending "paid_instore" to n8n
        accept_whatsapp,
        enter_competition,
        coupon_code,
        created_at: new Date().toISOString(),
        is_walk_in: coupon_code === 'MULLIGAN_ADMIN_100' // Helper flag for n8n
      }

      try {
         fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        }).catch(err => console.error("Webhook failed", err));
      } catch (webhookError) {
        console.error("[v0] n8n webhook error:", webhookError)
      }
    }

    // --- CHECKOUT LOGIC ---

    // If verified as a bypass (Admin or Free Coupon), return success immediately
    if (skipYoco) {
      return NextResponse.json({
        free_booking: true,
        booking_id: booking.id,
        message: dbPaymentStatus === 'paid_instore' ? "Walk-in Confirmed" : "Booking confirmed with coupon",
      })
    }

    // Determine Deposit Amount for Yoco
    const getDepositAmount = () => {
      if (session_type === "famous-course") {
        if (famous_course_option === "4-ball") return 400
        if (famous_course_option === "3-ball") return 300
      }
      return dbTotalPrice
    }

    const depositAmount = getDepositAmount()
    console.log("[v0] Initializing Yoco payment for R", depositAmount)

    // Normal payment flow with Yoco
    const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(depositAmount * 100),
        currency: "ZAR",
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://themulligan.co.za"}/booking?cancelled=true`,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://themulligan.co.za"}/api/payment/verify?reference=${booking.id}`,
        failureUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://themulligan.co.za"}/booking?error=payment_failed`,
        metadata: {
          bookingId: booking.id,
          guestName: guest_name,
          guestPhone: guest_phone,
          bookingDate: booking_date,
          startTime: start_time,
          playerCount: player_count?.toString() || "0",
          sessionType: session_type,
          depositAmount: depositAmount.toString(),
          totalAmount: dbTotalPrice.toString(),
        },
      }),
    })

    const yocoData = await yocoResponse.json()

    if (!yocoResponse.ok || !yocoData.redirectUrl) {
      console.error("[v0] Yoco initialization error:", yocoData)
      return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 })
    }

    await supabase
      .from("bookings")
      .update({ yoco_payment_id: yocoData.id })
      .eq("id", booking.id)

    return NextResponse.json({
      authorization_url: yocoData.redirectUrl,
      checkout_id: yocoData.id,
      reference: booking.id,
    })
  } catch (error) {
    console.error("[v0] Payment initialization error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function calculateEndTime(startTime: string, durationHours: number): string {
  if (!startTime) return "";
  const [hours, minutes] = startTime.split(":").map(Number)
  const totalMinutes = hours * 60 + minutes + durationHours * 60
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:00`
}
