import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const date = searchParams.get("date")

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service key for admin access
        )

        // Fetch all bookings for the date
        const { data: bookings, error } = await supabase
            .from("bookings")
            .select("start_time, duration_hours, simulator_id")
            .eq("booking_date", date)
            .neq("status", "cancelled")

        if (error) throw error

        // Initialize time slots (06:00 to 22:00)
        const timeSlots: Record<string, { time: string, bookings: number, capacity: 3, available: boolean }> = {}

        for (let i = 6; i <= 22; i++) {
            const hour = i.toString().padStart(2, '0') + ":00"
            timeSlots[hour] = {
                time: hour,
                bookings: 0,
                capacity: 3, // 3 Simulators
                available: true
            }
        }

        // simplistic occupancy calculation (hourly)
        // improved logic would handle 30min slots, but for dashboard overview hourly is a good start
        bookings?.forEach(booking => {
            const startHour = parseInt(booking.start_time.split(':')[0])
            const duration = Math.ceil(booking.duration_hours) // Round up for safety

            for (let i = 0; i < duration; i++) {
                const hour = (startHour + i).toString().padStart(2, '0') + ":00"
                if (timeSlots[hour]) {
                    timeSlots[hour].bookings += 1
                    if (timeSlots[hour].bookings >= 3) {
                        timeSlots[hour].available = false
                    }
                }
            }
        })

        return NextResponse.json(Object.values(timeSlots))

    } catch (error: any) {
        console.error("Availability API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
