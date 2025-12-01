import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()
    if (!bookingId) return NextResponse.json({ error: "No ID" }, { status: 400 })

    const supabase = await createClient()

    // 1. Fetch the Booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    if (error || !booking) {
      console.error("Booking Fetch Error:", error)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // 2. Calculate Money
    let totalPrice = Number(booking.total_price) || 0
    let depositAmount = totalPrice
    const sessionStr = String(booking.session_type || "").toLowerCase()
    
    if (sessionStr.includes("famous") || sessionStr.includes("ball")) {
      depositAmount = Math.ceil(totalPrice * 0.40)
    }
    const outstandingBalance = totalPrice - depositAmount

    // 3. TRIGGER N8N (CHECK THIS URL)
    const n8nUrl = "https://n8n.srv1127912.hstgr.cloud/webhook/manual-confirm" // <--- MUST MATCH N8N
    
    // Fire and forget (don't await excessively long)
    fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: "mulligan-secure-8821", 
        bookingId: booking.id,
        yocoId: booking.yoco_payment_id || "manual_web_confirm",
        paymentStatus: booking.payment_status || "paid",
        
        // Email Data
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        simulator_id: booking.simulator_id,
        
        // Money Data
        depositPaid: depositAmount.toFixed(2),
        outstandingBalance: outstandingBalance.toFixed(2),
        totalPrice: totalPrice.toFixed(2)
      }),
    }).catch(err => console.error("n8n Trigger Error:", err))

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
