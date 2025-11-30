import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 1. Force Edge Runtime
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

    const supabase = await createClient()

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
    // 3. MULTI-BAY ASSIGNMENT LOGIC (With Ghost Filter)
    // ---------------------------------------------------------
    
    const requestedStartISO = createSASTTimestamp(booking_date, start_time);
    const requestedEndISO = addHoursToTimestamp(requestedStartISO, duration_hours);

    // Fetch ALL active bookings
    const { data: dailyBookings } = await supabase
        .from("bookings")
        .select("simulator_id, slot_start, slot_end, status, created_at")
        .eq("booking_date", booking_date)
        .neq("status", "cancelled")

    const takenBays = new Set<number>();
    const now = Date.now();
    
    if (dailyBookings) {
      dailyBookings.forEach(b => {
        // SMART FILTER: Ignore "pending" bookings older than 20 mins
        let isActive = true;
        if (b.status === 'pending') {
            const createdTime = new Date(b.created_at).getTime();
            if ((now - createdTime) > 1200000) { // 20 mins
                isActive = false;
            }
        }

        if (isActive) {
            const bStart = new Date(b.slot_start).getTime();
            const bEnd = new Date(b.slot_end).getTime();
            const reqStart = new Date(requestedStartISO).getTime();
            const reqEnd = new Date(requestedEndISO).getTime();

            const isOverlapping = (bStart < reqEnd) && (bEnd > reqStart);
            
            if (isOverlapping) {
               takenBays.add(b.simulator_id);
            }
        }
      });
    }

    let assignedSimulatorId = 0
    if (!takenBays.has(1)) assignedSimulatorId = 1
    else if (!takenBays.has(2)) assignedSimulatorId = 2
    else if (!takenBays.has(3)) assignedSimulatorId = 3
    
    if (assignedSimulatorId === 0) {
        return NextResponse.json({ error: "Sorry, all bays are full for this time duration." }, { status: 409 })
    }

    // ---------------------------------------------------------
    // 4. CREATE DB ROW
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
        simulator_id: assignedSimulatorId, 
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

    if (skipYoco) {
      return NextResponse.json({
        free_booking: true,
        booking_id: booking.id,
        message: dbPaymentStatus === "paid_instore" ? "Walk-in Confirmed" : "Booking confirmed with coupon",
      })
    }

    // ---------------------------------------------------------
    // 5. DEPOSIT LOGIC
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
        cancelUrl: `${appUrl}/booking?cancelled=true`,
        // FIXED URL HERE:
        successUrl: `${appUrl}/booking/success?bookingId=${booking.id}`, 
        failureUrl: `${appUrl}/booking?error=payment_failed`,
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
      console.error("Yoco Error:", yocoData)
      return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 })
    }

    return NextResponse.json({
      redirectUrl: yocoData.redirectUrl,
      booking_id: booking.id,
    })

 } catch (error: any) {
    console.error("Server Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
