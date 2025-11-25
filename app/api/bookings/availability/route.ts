export const runtime = "nodejs"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get("date")
    const duration = Number.parseFloat(searchParams.get("duration") || "1")

    if (!dateParam) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 })
    }

    // Parse the date
    const requestDate = new Date(dateParam)
    const formattedDate = requestDate.toISOString().split("T")[0]

    const supabase = await createClient()

    // Fetch all bookings for the specified date that are not cancelled
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("start_time, end_time, duration_hours")
      .eq("booking_date", formattedDate)
      .neq("status", "cancelled")

    if (error) {
      console.error("[v0] Error fetching bookings:", error)
      throw error
    }

    // Convert bookings to time slot strings (HH:MM format)
    const bookedSlots =
      bookings?.map((booking) => {
        // Extract just HH:MM from the time
        const startTime = booking.start_time.substring(0, 5)
        return startTime
      }) || []

    return NextResponse.json({
      bookedSlots,
      date: formattedDate,
      totalBookings: bookings?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Availability API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
