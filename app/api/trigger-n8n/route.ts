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
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // 2. Re-Calculate the 40% Split (Same logic as Checkout)
    // We do this here so n8n gets accurate numbers for the email
    let totalPrice = Number(booking.total_price) || 0
    let depositAmount = totalPrice // Default to full price

    const sessionStr = String(booking.session_type || "").toLowerCase()
    const optionStr = String(booking.famous_course_option || "").toLowerCase()

    // If it's Famous or Multi-ball, apply 40% rule
    if (sessionStr.includes("famous") || sessionStr.includes("ball") || optionStr.includes("ball")) {
      depositAmount = Math.ceil(totalPrice * 0.40)
    }

    const outstandingBalance = totalPrice - depositAmount

    // 3. Send to n8n (Using YOUR specific URL and Secret)
    const n8nUrl = "https://n8n.srv1127912.hstgr.cloud/webhook/manual-confirm"
    
    const n8nResponse = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: "mulligan-secure-8821", // MATCHES YOUR N8N CODE
        bookingId: booking.id,
        yocoId: booking.yoco_payment_id || "manual_web_confirm",
        paymentStatus: "paid", // We assume paid if they reached success
        // Data for Emails
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        simulator_id: booking.simulator_id,
        // The Calculated Money Values
        depositPaid: depositAmount.toFixed(2),
        outstandingBalance: outstandingBalance.toFixed(2),
        totalPrice: totalPrice.toFixed(2)
      }),
    })

    if (!n8nResponse.ok) {
      console.error("n8n Failed", n8nResponse.status)
      return NextResponse.json({ error: "Automation failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
