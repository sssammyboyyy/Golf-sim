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
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("slot_start, slot_end")
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
  const getSlotTimeDate = (dateStr: string, timeStr: string) => {
    return new Date(`${dateStr}T${timeStr}:00+02:00`); // Force SAST Date Object
  }

  slots.forEach((time) => {
    // Current slot time
    const slotStart = getSlotTimeDate(date, time).getTime();
    const slotEnd = slotStart + (30 * 60 * 1000); // +30 mins

    // COUNT bookings that cover this specific 30-min block
    const activeBookings = bookings.filter((b) => {
      // Convert DB timestamps (often UTC) to Milliseconds for safe comparison
      const bStart = new Date(b.slot_start).getTime();
      const bEnd = new Date(b.slot_end).getTime();

      // Check overlap: Booking starts before Slot ends AND Booking ends after Slot starts
      return bStart < slotEnd && bEnd > slotStart;
    })

    // If 3 or more bays are occupied during this 30-min block, mark it full
    if (activeBookings.length >= 3) {
      bookedSlots.push(time)
    }
  })

  return NextResponse.json({ bookedSlots }) // Return object { bookedSlots: [...] } to match frontend
}
