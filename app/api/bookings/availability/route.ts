import { type NextRequest, NextResponse } from "next/server"

export const runtime = 'edge';

// This is safe because we only expose start_time data, not user info
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get("date")

    if (!dateParam) {
      return NextResponse.json({ bookedSlots: [], error: "Date parameter is required" }, { status: 400 })
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log("[v0] Missing Supabase config - returning empty slots for demo")
      // Return empty slots when Supabase is not configured (allows UI to still work)
      return NextResponse.json({
        bookedSlots: [],
        date: dateParam,
        totalBookings: 0,
        demo: true,
      })
    }

    // Parse and format the date
    const requestDate = new Date(dateParam)
    if (isNaN(requestDate.getTime())) {
      return NextResponse.json({ bookedSlots: [], error: "Invalid date format" }, { status: 400 })
    }
    const formattedDate = requestDate.toISOString().split("T")[0]

    // This avoids the JSON parsing issues with the Supabase client
    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?booking_date=eq.${formattedDate}&status=neq.cancelled&select=start_time`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.log("[v0] Supabase REST API error:", response.status, errorText)
      // Return empty slots on error so UI still works
      return NextResponse.json({
        bookedSlots: [],
        date: formattedDate,
        totalBookings: 0,
        error: "Database query failed",
      })
    }

    const bookings = await response.json()

    // Convert bookings to time slot strings (HH:MM format)
    const bookedSlots = (bookings || [])
      .map((booking: { start_time?: string }) => booking.start_time?.substring(0, 5) || "")
      .filter(Boolean)

    return NextResponse.json({
      bookedSlots,
      date: formattedDate,
      totalBookings: bookings?.length || 0,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.log("[v0] Availability API error:", errorMessage)
    // Return empty slots on error so UI still works
    return NextResponse.json({
      bookedSlots: [],
      error: "Internal server error",
      details: errorMessage,
    })
  }
}
