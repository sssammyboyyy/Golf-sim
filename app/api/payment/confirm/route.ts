import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { bookingId } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. Fetch the REAL booking
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    // Default values if fetch fails (fallback)
    let total = 0
    let paid = 0
    let outstanding = 0
    let guestName = "Guest"
    let guestEmail = "admin@themulligan.co.za"

    if (booking) {
      total = Number(booking.total_price) || 0
      paid = Number(booking.amount_paid) || 0 // Use actual DB value
      outstanding = total - paid
      guestName = booking.guest_name || "Guest"
      guestEmail = booking.guest_email || "admin@themulligan.co.za"
    }

    // 2. SELF-HEAL AND TRIGGER MODERN N8N
    // We mark the booking as confirmed/paid_instore (bypass) here,
    // then call the unified trigger-n8n route which handles the premium payload.
    await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_status: "paid_instore",
        updated_at: new Date().toISOString()
      })
      .eq("id", bookingId)

    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const triggerUrl = `${appUrl}/api/trigger-n8n`

    console.log(`[Coupon Bypass] Triggering unified n8n flow: ${triggerUrl}`)

    await fetch(triggerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId })
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: "Failed to trigger automation" }, { status: 500 })
  }
}
