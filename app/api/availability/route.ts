import { createClient } from "@supabase/supabase-js"
import { createSASTTimestamp } from "@/lib/utils"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const date = searchParams.get("date")

        if (!date) {
            return Response.json({ error: "Date is required" }, { status: 400 })
        }

        // Use Service Role for Availability to bypass RLS and see all bookings
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Fetch all non-cancelled bookings for the date
        const { data: bookings, error } = await supabase
            .from("bookings")
            .select("start_time, duration_hours, simulator_id, status")
            .eq("booking_date", date)
            .neq("status", "cancelled")

        if (error) throw error

        // Initialize time slots (06:00 to 22:00)
        // Note: Venue closing hours logic is handled in initialization
        const timeSlots: any[] = []
        for (let i = 6; i <= 21; i++) { // Last 1-hour slot starts at 21:00
            const hour = i.toString().padStart(2, '0') + ":00"
            timeSlots.push({
                time: hour,
                bookings: 0,
                capacity: 3, // 3 bays total
                available: true
            })
        }

        // Occupancy calculation
        bookings?.forEach(booking => {
            const startHour = parseInt(booking.start_time.split(':')[0])
            const duration = Math.ceil(booking.duration_hours)

            for (let i = 0; i < duration; i++) {
                const h = (startHour + i)
                const slot = timeSlots.find(s => parseInt(s.time.split(':')[0]) === h)
                if (slot) {
                    slot.bookings += 1
                    if (slot.bookings >= 3) {
                        slot.available = false
                    }
                }
            }
        })

        return Response.json(timeSlots, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-store, max-age=0"
            }
        })

    } catch (error: any) {
        console.error("[AVAILABILITY] Error:", error.message)
        return Response.json({ error: error.message }, { status: 500 })
    }
}
