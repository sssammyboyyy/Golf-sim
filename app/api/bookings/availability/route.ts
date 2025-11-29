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

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("slot_start, slot_end, simulator_id")
    .eq("booking_date", date)
    .neq("status", "cancelled")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Define operating hours
  const slots: string[] = []
  for (let h = 9; h < 20; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`)
    slots.push(`${h.toString().padStart(2, "0")}:30`)
  }

  const bookedSlots: string[] = []
  
  // Helper: Create a real Date object for the requested slot
  const getSlotDate = (dateStr: string, timeStr: string) => {
    return new Date(`${dateStr}T${timeStr}:00+02:00`)
  }

  slots.forEach((time) => {
    const slotDate = getSlotDate(date, time)
    const slotEnd = new Date(slotDate.getTime() + 30 * 60000) // +30 mins

    // ROBUST OVERLAP CHECK (Date vs Date)
    const activeBookings = bookings.filter((b) => {
      const bStart = new Date(b.slot_start)
      const bEnd = new Date(b.slot_end)
      // Overlap formula: (StartA < EndB) and (EndA > StartB)
      return bStart < slotEnd && bEnd > slotDate
    })

    // Block if 3 bays are full
    if (activeBookings.length >= 3) {
      bookedSlots.push(time)
    }
  })

  return NextResponse.json({ bookedSlots })
}
