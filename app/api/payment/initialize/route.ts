import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 1. Force Edge Runtime for Cloudflare Pages (Critical)
export const runtime = "edge"

// Helper: Force SAST Timezone (+02:00) construction
// This ensures 14:00 is read as South African time, not UTC
function createSASTTimestamp(dateStr: string, timeStr: string): string {
  const cleanTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${cleanTime}+02:00`;
}

// Helper: Add hours to a timestamp for the end time
function addHoursToTimestamp(timestamp: string, hours: number): string {
  const date = new Date(timestamp);
  date.setHours(date.getHours() + hours);
  return date.toISOString(); 
}

// Keep the text helper for the 'end_time' text column (Legacy UI support)
function calculateEndTimeText(start: string, duration: number): string {
  const [hours, minutes] = start.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  date.setHours(date.getHours() + duration)
  return date.toTimeString().slice(0, 5) 
}

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
      total_price,
      guest_name,
      guest_email,
      guest_phone,
      accept_whatsapp,
      enter_competition,
      coupon_code,
      simulator_id = 1, // Default to 1 if not provided (Critical for locking)
    } = body

    const supabase = await createClient()

    // 1. Sanitize Coupon Code
    const cleanCouponCode = coupon_code ? coupon_code.trim() : null

    let dbTotalPrice = total_price
    let dbPaymentStatus = "pending"
    let dbStatus = "pending"
    let skipYoco = false
    let couponApplied = null

    // 2. Coupon Logic
    if (cleanCouponCode) {
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", cleanCouponCode)
        .eq("is_active", true)
        .single()

      if (couponData) {
        couponApplied = cleanCouponCode
        // ADMIN BYPASS
        if (couponData.code === "MULLIGAN_ADMIN_100") {
          dbTotalPrice = base_price 
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
      }
    }

    // Fallback: free price
    if (total_price === 0 && !skipYoco) {
      dbPaymentStatus = "completed"
      dbStatus = "confirmed"
      skipYoco = true
    }

    // 3. CRITICAL: Construct Timestamps for DB Constraint
    // We must manually build the ISO string with SAST offset to be safe
    const slotStartISO = createSASTTimestamp(booking_date, start_time);
    const slotEndISO = addHoursToTimestamp(slotStartISO, duration_hours);
    const endTimeText = calculateEndTimeText(start_time, duration_hours);

    // 4. Insert Booking
    // We insert BOTH the text columns (for your UI) AND the timestamps (for the lock)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_date,
        start_time,
        end_time: endTimeText,
        slot_start: slotStartISO, // <--- THE LOCK KEY (Missing in your code)
        slot_end: slotEndISO,     // <--- THE LOCK KEY (Missing in your code)
        duration_hours,
        player_count,
        simulator_id, 
        user_type: "guest",
        session_type,
        famous_course_option,
        base_price,
        total_price: dbTotalPrice,
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
      console.error("Booking Insert Error:", bookingError)
      // Check for our custom constraint violation
      if (bookingError.code === '23P01') { 
        return NextResponse.json({ error: "Slot already taken (Double Booking prevented)" }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
    }

    // 5. Return Early if Yoco is Skipped
    if (skipYoco) {
      return NextResponse.json({
        free_booking: true,
        booking_id: booking.id,
        message: dbPaymentStatus === "paid_instore" ? "Walk-in Confirmed" : "Booking confirmed with coupon",
      })
    }

    // 6. Deposit Logic
    const getDepositAmount = () => {
      if (session_type === "famous-course") {
        if (famous_course_option === "4-ball") return 600
        if (famous_course_option === "3-ball") return 450 
      }
      return dbTotalPrice
    }
    const depositAmount = getDepositAmount()

    // 7. Dynamic Production URL (Cloudflare Context)
    // Uses the Cloudflare Environment Variable you set in Step 4
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.themulligan.org"

    const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(depositAmount * 100),
        currency: "ZAR",
        cancelUrl: `${appUrl}/booking?cancelled=true`,
        successUrl: `${appUrl}/api/payment/verify?reference=${booking.id}`,
        failureUrl: `${appUrl}/booking?error=payment_failed`,
        metadata: {
          bookingId: booking.id,
        },
      }),
    })

    const yocoData = await yocoResponse.json()

    if (!yocoResponse.ok) {
      console.error("Yoco Error:", yocoData)
      return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 })
    }

    return NextResponse.json({
      redirectUrl: yocoData.redirectUrl,
      booking_id: booking.id,
    })
 } catch (error) {
    console.error("Server Error:", error)
    // Standard error response
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
