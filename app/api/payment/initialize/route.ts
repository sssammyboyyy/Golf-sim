import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// 1. Force Edge Runtime
export const runtime = "edge"

// --- HELPER FUNCTIONS ---

// Helper: Force SAST Timezone (+02:00)
function createSASTTimestamp(dateStr: string, timeStr: string): string {
  // Ensure time is HH:mm:00
  const cleanTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${cleanTime}+02:00`;
}

// Helper: Add hours (Fixed for 1.5h support)
// We use milliseconds to avoid setHours() truncating decimals
function addHoursToTimestamp(timestamp: string, hours: number): string {
  const date = new Date(timestamp);
  const millisecondsToAdd = hours * 60 * 60 * 1000;
  date.setTime(date.getTime() + millisecondsToAdd);
  return date.toISOString(); 
}

// Helper: Calculate text end time (e.g. "15:30")
function calculateEndTimeText(start: string, duration: number): string {
  const [hours, minutes] = start.split(":").map(Number);
  const totalMinutes = (hours * 60) + minutes + (duration * 60);
  
  const endH = Math.floor(totalMinutes / 60);
  const endM = totalMinutes % 60;
  
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // --- 1. MAPPING VARIABLES (Robust Parsing) ---
    const booking_date = body.booking_date || body.date
    const start_time = body.start_time || body.timeSlot
    const duration_hours = Number(body.duration_hours || body.duration)
    const player_count = Number(body.player_count || body.players)
    
    const session_type = body.session_type || body.sessionType 
    const famous_course_option = body.famous_course_option || ""
    
    const base_price = Number(body.base_price || 0)
    const total_price = Number(body.total_price || body.totalPrice)
    
    const guest_name = body.guest_name || body.customerName
    const guest_email = body.guest_email || body.customerEmail
    const guest_phone = body.guest_phone || body.customerPhone
    
    const {
      accept_whatsapp,
      enter_competition,
      coupon_code,
      golf_club_rental,
      coaching_session
    } = body

    const supabase = await createClient()

    // ---------------------------------------------------------
    // 2. COUPON & ADMIN LOGIC
    // ---------------------------------------------------------
    let dbTotalPrice = total_price
    let dbPaymentStatus = "pending"
    let dbStatus = "pending"
    let skipYoco = false
    let couponApplied = null

    const cleanCouponCode = coupon_code ? String(coupon_code).trim().toUpperCase() : null

    if (cleanCouponCode && cleanCouponCode.length > 0) {
      
      // A. ADMIN BYPASS (Walk-ins)
      if (cleanCouponCode === "MULLIGAN_ADMIN_100") {
          console.log("Admin Bypass Detected")
          dbTotalPrice = Number(base_price) // Keep base price for revenue stats
          dbPaymentStatus = "paid_instore" 
          dbStatus = "confirmed" // Instant confirmation
          skipYoco = true
          couponApplied = cleanCouponCode
      } 
      // B. STANDARD COUPONS
      else {
        const { data: couponData } = await supabase
          .from("coupons")
          .select("*")
          .eq("code", cleanCouponCode)
          .eq("is_active", true)
          .single()

        if (couponData) {
          couponApplied = cleanCouponCode
          
          if (couponData.discount_percent === 100) {
            dbTotalPrice = 0
            dbPaymentStatus = "completed"
            dbStatus = "confirmed"
            skipYoco = true
          }
          else if (couponData.discount_percent > 0) {
             const discountAmount = (Number(base_price) * (couponData.discount_percent / 100));
             dbTotalPrice = Math.max(0, Number(base_price) - discountAmount);
          }
        }
      }
    }

    // Safety: If price is 0 for any reason, auto-confirm
    if (dbTotalPrice === 0 && !skipYoco) {
      dbPaymentStatus = "completed"
      dbStatus = "confirmed"
      skipYoco = true
    }

    // ---------------------------------------------------------
    // 3. MULTI-BAY ASSIGNMENT LOGIC
    // ---------------------------------------------------------
    const requestedStartISO = createSASTTimestamp(booking_date, start_time);
    const requestedEndISO = addHoursToTimestamp(requestedStartISO, duration_hours);

    const { data: dailyBookings } = await supabase
        .from("bookings")
        .select("simulator_id, slot_start, slot_end")
        .eq("booking_date", booking_date)
        .neq("status", "cancelled")

    const takenBays = new Set<number>();
    if (dailyBookings) {
      dailyBookings.forEach(b => {
        // Check overlap: (StartA < EndB) and (EndA > StartB)
        const isOverlapping = (b.slot_start < requestedEndISO) && (b.slot_end > requestedStartISO);
        if (isOverlapping) takenBays.add(b.simulator_id);
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
    const endTimeText = calculateEndTimeText(start_time, duration_hours);

    // Derive slot_type to satisfy Check Constraints (if any exist in your DB)
    const sessionStr = String(session_type || "").toLowerCase();
    let derivedSlotType = "regular";
    if (sessionStr.includes("3ball")) derivedSlotType = "3ball18";
    if (sessionStr.includes("4ball")) derivedSlotType = "4ball18";
    if (sessionStr.includes("quick")) derivedSlotType = "quickplay";

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        booking_date,
        start_time,
        end_time: endTimeText,
        slot_start: requestedStartISO, // Use the ISO we calculated earlier
        slot_end: requestedEndISO,
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
        
        // Customer Data
        guest_name,
        guest_email,
        guest_phone,
        accept_whatsapp: !!accept_whatsapp,
        enter_competition: !!enter_competition,
        coupon_code: couponApplied,

        // Technical Fields
        slot_type: derivedSlotType, 
        payment_type: skipYoco ? "bypass" : "deposit", 
        notes: `Addons: Clubs=${!!golf_club_rental}, Coach=${!!coaching_session}`
      })
      .select()
      .single()

    if (bookingError) {
      console.error("Booking Insert Error:", bookingError)
      return NextResponse.json({ 
        error: "Failed to create booking", 
        details: bookingError.message 
      }, { status: 500 })
    }

    // --- SUCCESS: Return early if no payment needed (Admin/Walk-in) ---
    if (skipYoco) {
      return NextResponse.json({
        free_booking: true,
        booking_id: booking.id,
        message: "Booking confirmed successfully"
      })
    }

    // ---------------------------------------------------------
    // 5. DEPOSIT & YOCO
    // ---------------------------------------------------------
    let amountToCharge = dbTotalPrice; 
    const optionStr = String(famous_course_option || "").toLowerCase();
    
    // Deposit Rule: 40% for Famous Courses or Multi-ball
    if (sessionStr.includes("famous") || sessionStr.includes("ball") || optionStr.includes("ball")) {
         amountToCharge = Math.ceil(dbTotalPrice * 0.40);
    }
    
    const outstandingBalance = dbTotalPrice - amountToCharge;
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.themulligan.org"

    const yocoResponse = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amountToCharge * 100), // Yoco needs cents
        currency: "ZAR",
        cancelUrl: `${appUrl}/booking?cancelled=true`,
        successUrl: `${appUrl}/success?bookingId=${booking.id}`, 
        failureUrl: `${appUrl}/booking?error=payment_failed`,
        metadata: {
          bookingId: booking.id,
          // Fixed to 2 decimals for clean emails
          totalPrice: dbTotalPrice.toFixed(2), 
          depositPaid: amountToCharge.toFixed(2),
          outstandingBalance: outstandingBalance.toFixed(2),
          isDeposit: (outstandingBalance > 0).toString()
        },
      }),
    })

    const yocoData = await yocoResponse.json()

    // Save Yoco ID immediately
    if (yocoData.id) {
       await supabase.from("bookings").update({ yoco_payment_id: yocoData.id }).eq("id", booking.id)
    }

    if (!yocoResponse.ok) {
      console.error("Yoco Init Failed:", yocoData)
      return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 })
    }

    return NextResponse.json({
      redirectUrl: yocoData.redirectUrl,
      booking_id: booking.id,
    })

 } catch (error: any) {
    console.error("Server Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
