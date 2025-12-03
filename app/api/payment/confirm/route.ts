import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json({ error: "Missing Booking ID" }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Fetch FRESH data from the Database
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    if (error || !booking) {
      console.error("Booking lookup failed:", error)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // 2. Calculate Financials using DB columns
    // Database uses 'total_price' and 'amount_paid'
    const total = Number(booking.total_price) || 0
    const paid = Number(booking.amount_paid) || 0
    
    // Calculate outstanding
    // If 'amount_due' exists in DB, we could use it, but calculating ensures accuracy
    const outstanding = total - paid

    // 3. Prepare Payload matching DB columns (snake_case) 
    // This helps consistency if you use DB rows in n8n later
    const payload = {
        secret: "mulligan-secure-8821",
        bookingId: booking.id,
        yocoId: booking.yoco_payment_id || "manual",
        paymentStatus: booking.payment_status || "paid",
        
        // Guest Info
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        
        // Booking Info
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        simulator_id: booking.simulator_id,
        
        // Financials - Sending BOTH formats to be safe
        // CamelCase (Legacy support for your current n8n config)
        totalPrice: total.toFixed(2),
        depositPaid: paid.toFixed(2),
        outstandingBalance: outstanding.toFixed(2),

        // Snake_case (Matches your Database Schema)
        total_price: total.toFixed(2),
        amount_paid: paid.toFixed(2),
        amount_due: outstanding.toFixed(2)
    }

    // 4. Send to n8n
    const n8nUrl = "https://n8n.srv1127912.hstgr.cloud/webhook/manual-confirm"
    
    await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Trigger Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
