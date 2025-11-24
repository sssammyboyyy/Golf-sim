import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Ideally use 'edge' on Cloudflare, but 'nodejs' is fine with OpenNext if configured correctly.
export const runtime = "nodejs"

// Helper to calculate end time (ensure this handles hour wrapping if needed)
function calculateEndTime(start: string, duration: number): string {
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
      coupon_code, // Input from frontend
    } = body

    const supabase = await createClient()
    
    // 1. Sanitize Coupon Code (Remove whitespace)
    const cleanCouponCode = coupon_code ? coupon_code.trim() : null

    let dbTotalPrice = total_price
    let dbPaymentStatus = "pending"
    let dbStatus = "pending"
    let skipYoco = false
    let couponApplied = null

    // 2. Handle Coupon Logic
    if (cleanCouponCode) {
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", cleanCouponCode)
        .eq("is_active", true)
        .single()

      if (couponData) {
        couponApplied = cleanCouponCode
        
        // ADMIN BYPASS LOGIC
        if (couponData.code === "MULLIGAN_ADMIN_100") {
          console.log("Admin Coupon Detected: Bypassing Payment")
          dbTotalPrice = base_price // Record full value for revenue stats
          dbPaymentStatus = "paid_instore" // Mark as paid via admin/cash/card-machine
          dbStatus = "confirmed"
          skipYoco = true
        } 
        // 100% DISCOUNT LOGIC
        else if (couponData.discount_percent === 100) {
          dbTotalPrice = 0
          dbPaymentStatus = "completed"
          dbStatus = "confirmed"
          skipYoco = true
        }
      } else {
        console.warn(`Coupon not found or inactive: ${cleanCouponCode}`)
      }
    }

    // Fallback: If price is 0 for any other reason
    if (total_price === 0 && !skipYoco) {
      dbPaymentStatus = "completed"
      dbStatus = "confirmed"
      skipYoco = true
    }

    // 3. Insert Booking
    const endTime = calculateEndTime(start_time, duration_hours)
    
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_date,
        start_time,
        end_time: endTime,
        duration_hours,
        player_count,
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
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
    }

    // 4. Return Early if Yoco is Skipped (Admin or Free)
    if (skipYoco) {
      return NextResponse.json({
        free_booking: true,
        booking_id: booking.id,
        message: dbPaymentStatus === "paid_instore" ? "Walk-in Confirmed" : "Booking confirmed with coupon",
      })
    }

    // 5. Calculate Deposit/Charge Amount
    const getDepositAmount = () => {
      if (session_type === "famous-course") {
        if (famous_course_option === "4-ball") return 400
        if (famous_course_option === "3-ball") return 300
      }
      return dbTotalPrice
    }
    const depositAmount = getDepositAmount()

    // 6. FIX: Hardcode the fallback to .org
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.themulligan.org"

    const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(depositAmount * 100), // Yoco uses cents
        currency: "ZAR",
        cancelUrl: `${appUrl}/booking?cancelled=true`,
        successUrl: `${appUrl}/api/payment/verify?reference=${booking.id}`, // This must match the correct domain
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
