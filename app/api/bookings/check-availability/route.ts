export const runtime = "nodejs"

import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { booking_date, start_time, duration_hours } = await request.json()

    // Calculate end time
    const [hours, minutes] = start_time.split(":").map(Number)
    const durationHours = Math.floor(duration_hours)
    const durationMinutes = Math.round((duration_hours % 1) * 60)
    const endHours = hours + durationHours
    const endMinutes = minutes + durationMinutes
    const end_time = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`

    // Check for overlapping bookings
    const { data: overlappingBookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", booking_date)
      .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`)
      .neq("status", "cancelled")

    if (error) {
      console.error("[v0] Availability check error:", error)
      return NextResponse.json({ error: "Failed to check availability" }, { status: 500 })
    }

    const isAvailable = !overlappingBookings || overlappingBookings.length === 0

    return NextResponse.json({
      available: isAvailable,
      conflicting_bookings: overlappingBookings?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Availability check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
