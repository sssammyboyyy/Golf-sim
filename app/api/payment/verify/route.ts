import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const reference = searchParams.get("reference") // This is the booking_id

  // 1. Basic Validation
  if (!reference) {
    return NextResponse.redirect(new URL("/booking?error=no_payment_reference", request.url))
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 2. Check the Booking in DB
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("status, payment_status")
      .eq("id", reference)
      .single()

    if (error || !booking) {
      console.error("Verify Error:", error)
      return NextResponse.redirect(new URL("/booking?error=booking_not_found", request.url))
    }

    // 3. Smart Redirect
    // Even if status is 'pending' (because n8n is slow), we assume success if they got here from Yoco.
    // The Frontend Success page can show a "Confirming..." spinner if needed.
    return NextResponse.redirect(new URL(`/booking/success?reference=${reference}`, request.url))

  } catch (error) {
    console.error("Verify Exception:", error)
    // Fallback: If anything explodes, just try to send them to success anyway with the ID
    return NextResponse.redirect(new URL(`/booking/success?reference=${reference}`, request.url))
  }
}
