import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js" // Import directly, not from lib

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json({ error: "Missing Booking ID" }, { status: 400 })
    }

    // 1. Initialize Supabase Admin Client (Bypass RLS)
    // We do this manually here to use the SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Environment Variables")
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Fetch Booking Data (as Admin)
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    if (error || !booking) {
      console.error("Supabase Error:", error)
      return NextResponse.json({ error: "Booking not found (DB Error)" }, { status: 404 })
    }

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
        
        // Snake_case (Matches DB)
        total_price: total.toFixed(2),
        amount_paid: paid.toFixed(2),
        amount_due: outstanding.toFixed(2),
        
        // CamelCase (Legacy n8n support)
        totalPrice: total.toFixed(2),
        depositPaid: paid.toFixed(2),
        outstandingBalance: outstanding.toFixed(2)
    }

    // 4. Send to n8n
    const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.srv1127912.hstgr.cloud/webhook/manual-confirm"
    
    // We await this to ensure we capture any n8n errors before responding
    const n8nResponse = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!n8nResponse.ok) {
       console.error("n8n returned error:", n8nResponse.status)
       // We log it but still return success to frontend so user isn't confused
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Critical Trigger Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
