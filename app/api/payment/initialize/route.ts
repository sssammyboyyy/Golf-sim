import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 1. Force Edge Runtime for Cloudflare Pages
export const runtime = "edge"

// Helper: Force SAST Timezone (+02:00) construction
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

// Helper: Calculate text end time
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
      simulator_id = 1, 
    } = body

    const supabase = await createClient()

    // ---------------------------------------------------------
    // 1. ROBUST COUPON & PRICE LOGIC
    // ---------------------------------------------------------
    let dbTotalPrice = total_price
    let dbPaymentStatus = "pending"
    let dbStatus = "pending"
    let skipYoco = false
    let couponApplied = null

    // Normalize input: trim spaces and make uppercase to avoid case mismatch
    const cleanCouponCode = coupon_code ? String(coupon_code).trim().toUpperCase() : null

    if (cleanCouponCode && cleanCouponCode.length > 0) {
      const { data: couponData } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", cleanCouponCode) // Ensure your DB codes are Uppercase or adjust this
        .eq("is_active", true)
        .single()

      if (couponData) {
        couponApplied = cleanCouponCode
        
        // ADMIN BYPASS (Walk-in / Cash in store)
        if (cleanCouponCode === "MULLIGAN_ADMIN_100") {
          dbTotalPrice = base_price 
          dbPaymentStatus = "paid_instore" 
          dbStatus = "confirmed"
          skipYoco = true
        }
        // 100% DISCOUNT (Friend / Promo)
        else if (couponData.discount_percent === 100) {
          dbTotalPrice = 0
          dbPaymentStatus = "completed"
          dbStatus = "confirmed"
          skipYoco = true
        }
        // PERCENTAGE DISCOUNT (e.g. 10% off)
        else if (couponData.discount_percent > 0) {
           const discountAmount = (base_price * (couponData.discount_percent / 100));
           dbTotalPrice = Math.max(0, base_price - discountAmount);
        }
      }
    }

    // Safety check for naturally free items (if any exist in future)
    if (dbTotalPrice === 0 && !skipYoco) {
      dbPaymentStatus = "completed"
      dbStatus = "confirmed"
      skipYoco = true
    }

    // ---------------------------------------------------------
    // 2. CREATE DB ROW (LOCK THE SLOT)
    // ---------------------------------------------------------
    const slotStartISO = createSASTTimestamp(booking_date, start_time);
    const slotEndISO = addHoursToTimestamp(slotStartISO, duration_hours);
    const endTimeText = calculateEndTimeText(start_time, duration_hours);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_date,
        start_time,
        end_time: endTimeText,
        slot_start: slotStartISO,
        slot_end: slotEndISO,
        duration_hours,
        player_count,
        simulator_id, 
        user_type: "guest",
        session_type,
        famous_course_option,
        base_price,
        total_price: dbTotalPrice, // The full value of the booking
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
      if (bookingError.code === '23P01') { 
        return NextResponse.json({ error: "Slot already taken" }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
    }

    // Return Early if Coupon handled it
    if (skipYoco) {
      return NextResponse.json({
        free_booking: true,
        booking_id: booking.id,
        message: dbPaymentStatus === "paid_instore" ? "Walk-in Confirmed" : "Booking confirmed with coupon",
      })
    }

    // ---------------------------------------------------------
    // 3. DEPOSIT LOGIC (40% Rule)
    // ---------------------------------------------------------
    let amountToCharge = dbTotalPrice; // Default: Charge full amount

    // Check if it is a 3-Ball or 4-Ball Special
    if (session_type === "famous-course" && famous_course_option) {
      if (famous_course_option.includes("3") || famous_course_option.includes("4")) {
         // Calculate 40%
         amountToCharge = Math.ceil(dbTotalPrice * 0.40);
      }
    }

    const outstandingBalance = dbTotalPrice - amountToCharge;

    // ---------------------------------------------------------
    // 4. YOCO CHECKOUT
    // ---------------------------------------------------------
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.themulligan.org"

    const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amountToCharge * 100), // Yoco expects cents
        currency: "ZAR",
        cancelUrl: `${appUrl}/booking?cancelled=true`,
        // Send them to a simple success page, n8n handles the heavy lifting
        successUrl: `${appUrl}/success?bookingId=${booking.id}`, 
        failureUrl: `${appUrl}/booking?error=payment_failed`,
        metadata: {
          bookingId: booking.id,
          // PASS THESE so n8n can email the clerk the details:
          totalPrice: dbTotalPrice, 
          depositPaid: amountToCharge,
          outstandingBalance: outstandingBalance,
          isDeposit: outstandingBalance > 0
        },
      }),
    })

    const yocoData = await yocoResponse.json()

    if (!yocoResponse.ok) {
      console.error("Yoco Error:", yocoData)
      // If payment fails to initialize, we should technically delete the pending booking
      // or let the auto-cancel cleaner handle it later.
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
