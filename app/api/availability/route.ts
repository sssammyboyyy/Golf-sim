import { getSupabaseAdmin } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const date = searchParams.get("date")

        if (!date) {
            return Response.json({ error: "Date is required" }, { status: 400 })
        }

        // Admin client for unrestricted reads across all bookings (Lazy Initialized)
        const supabase = getSupabaseAdmin()

        // SAST-aware query: fetch bookings using explicit +02:00 range
        const { data: bookings, error } = await supabase
            .from("bookings_test")
            .select("start_time, duration_hours, simulator_id, status")
            .eq("booking_date", date)
            .neq("status", "cancelled")

        if (error) throw error

        // Commit 3eb1753 stable record-based occupancy mapping
        const timeSlots: Record<string, { time: string, bookings: number, capacity: number, available: boolean }> = {}

        for (let i = 6; i <= 22; i++) {
            const hour = i.toString().padStart(2, '0') + ":00"
            timeSlots[hour] = {
                time: hour,
                bookings: 0,
                capacity: 3,
                available: true
            }
        }

        // Populate occupancy from existing bookings
        bookings?.forEach(booking => {
            const startHour = parseInt(booking.start_time.split(':')[0])
            const duration = Math.ceil(booking.duration_hours)

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

        return Response.json(Object.values(timeSlots))

    } catch (error: any) {
        console.error("[AVAILABILITY] Error:", error.message)
        return Response.json({ error: error.message }, { status: 500 })
    }
}
