import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  console.log(" [Trigger-n8n] Endpoint hit") // Logs to Cloudflare Dashboard

  try {
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      console.error(" [Trigger-n8n] No booking ID provided")
      return NextResponse.json({ error: "Missing Booking ID" }, { status: 400 })
    }

    // 1. Initialize Supabase
    const supabase = await createClient()
    
    // 2. Fetch Booking Data
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    if (error || !booking) {
      console.error(" [Trigger-n8n] Supabase Error or Not Found:", error)
      return NextResponse.json({ error: "Booking not found in DB" }, { status: 404 })
    }

    console.log(` [Trigger-n8n] Found booking for ${booking.guest_name}`)

    // 3. Prepare Payload
    const total = Number(booking.total_price) || 0
    const paid = Number(booking.amount_paid) || 0
    const outstanding = total - paid

    const payload = {
        secret: "mulligan-secure-8821",
        bookingId: booking.id,
        yocoId: booking.yoco_payment_id || "manual",
        paymentStatus: booking.payment_status || "paid",
        
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        simulator_id: booking.simulator_id,
        
        // Snake_case matches your DB
        total_price: total.toFixed(2),
        amount_paid: paid.toFixed(2),
        amount_due: outstanding.toFixed(2),
        
        // CamelCase for legacy compatibility
        totalPrice: total.toFixed(2),
        depositPaid: paid.toFixed(2),
        outstandingBalance: outstanding.toFixed(2)
    }

    // 4. Send to n8n (Awaiting it explicitly to ensure it fires)
    const n8nUrl = "https://n8n.srv1127912.hstgr.cloud/webhook/manual-confirm"
    
    console.log(" [Trigger-n8n] Sending to n8n...")
    
    const n8nResponse = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!n8nResponse.ok) {
        const text = await n8nResponse.text()
        console.error(" [Trigger-n8n] n8n Error:", text)
        // We still return success to the UI so the user isn't confused, 
        // but we log the error for you.
    } else {
        console.log(" [Trigger-n8n] n8n Success:", n8nResponse.status)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error(" [Trigger-n8n] CRITICAL ERROR:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
