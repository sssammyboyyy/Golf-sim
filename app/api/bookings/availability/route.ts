import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "edge"
export const dynamic = "force-dynamic" // <--- CRITICAL FIX

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Fetch ALL bookings for this date
  // We include 'pending' to prevent double-booking while someone is entering CC details
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("slot_start, slot_end, simulator_id, status")
    .eq("booking_date", date)
    .neq("status", "cancelled") // Count Pending + Confirmed + Completed

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. Define Operating Hours
  const slots: string[] = []
  for (let h = 9; h < 20; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`)
    slots.push(`${h.toString().padStart(2, "0")}:30`)
  }

  // 3. Logic Helper: Timezone Safe Comparison
  // We use .getTime() to compare explicit milliseconds
  const getSlotTimeMs = (dateStr: string, timeStr: string) => {
    // Construct strict ISO string for SAST (+02:00)
    // This ensures we are comparing Apples to Apples
    return new Date(`${dateStr}T${timeStr}:00+02:00`).getTime()
  }

  const bookedSlots: string[] = []

  slots.forEach((time) => {
    const slotTimeMs = getSlotTimeMs(date, time)
    
    // Count bookings covering this 30min slot
    const activeBookings = bookings.filter((b) => {
      const startMs = new Date(b.slot_start).getTime()
      const endMs = new Date(b.slot_end).getTime()
      
      // A booking covers this slot if:
      // It starts on or before the slot AND ends after the slot
      return startMs <= slotTimeMs && endMs > slotTimeMs
    })

    // 4. The "3-Bay" Rule
    // If 3 or more bookings overlap this specific moment, the time is Full.
    if (activeBookings.length >= 3) {
      bookedSlots.push(time)
    }
  })

  // Returns { bookedSlots: ["14:00", "14:30"] }
  return NextResponse.json({ bookedSlots })
}
