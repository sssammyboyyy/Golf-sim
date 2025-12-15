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

    // 2. Send to n8n
    const N8N_URL = "https://n8n.srv1127912.hstgr.cloud/webhook/manual-confirm"

    const payload = {
      secret: "mulligan-secure-8821",
      bookingId: bookingId,
      yocoId: "manual_coupon_bypass",
      paymentStatus: "paid_instore",

      guest_name: guestName,
      guest_email: guestEmail,

      // Financials - Sending BOTH formats
      totalPrice: total.toFixed(2),
      depositPaid: paid.toFixed(2),
      outstandingBalance: outstanding.toFixed(2),

      total_price: total.toFixed(2),
      amount_paid: paid.toFixed(2),
      amount_due: outstanding.toFixed(2)
    }

    await fetch(N8N_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: "Failed to trigger automation" }, { status: 500 })
  }
}
