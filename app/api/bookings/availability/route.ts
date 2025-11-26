import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Fetch ALL bookings for this date (excluding cancelled)
  // We fetch slot_start and slot_end to calculate overlaps
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("slot_start, slot_end, simulator_id")
    .eq("booking_date", date)
    .neq("status", "cancelled")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. Define your operating hours (09:00 to 20:00)
  const slots: string[] = []
  for (let h = 9; h < 20; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`)
    slots.push(`${h.toString().padStart(2, "0")}:30`)
  }

  // 3. Calculate Availability for each slot
  const bookedSlots: string[] = []

  // Helper to construct a comparison date for the specific slot time
  const getSlotTimeISO = (dateStr: string, timeStr: string) => {
    return `${dateStr}T${timeStr}:00+02:00` // SAST
  }

  slots.forEach((time) => {
    const slotTimeISO = getSlotTimeISO(date, time)
    
    // COUNT bookings that cover this specific 30-min block
    // A booking covers this slot if:
    // Booking Start <= Slot Time  AND  Booking End > Slot Time
    const activeBookings = bookings.filter((b) => {
      return b.slot_start <= slotTimeISO && b.slot_end > slotTimeISO
    })

    // If 3 or more bays are occupied during this 30-min block, mark it full
    if (activeBookings.length >= 3) {
      bookedSlots.push(time)
    }
  })

  return NextResponse.json(bookedSlots)
}
