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

  // 1. Fetch ALL bookings (We need created_at to filter stale ones)
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("slot_start, slot_end, status, created_at") // <--- Added created_at
    .eq("booking_date", date)
    .neq("status", "cancelled")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 2. Define operating hours
  const slots: string[] = []
  for (let h = 9; h < 20; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`)
    slots.push(`${h.toString().padStart(2, "0")}:30`)
  }

  // 3. Filter "Ghost" Bookings
  // A booking is valid if it is CONFIRMED OR if it is PENDING but created < 20 mins ago
  const now = Date.now();
  const validBookings = bookings.filter(b => {
    if (b.status === 'confirmed') return true;
    if (b.status === 'paid_instore') return true; // (For coupons)
    if (b.status === 'pending') {
       const createdTime = new Date(b.created_at).getTime();
       // Keep it if it's less than 20 minutes old (1200000 ms)
       return (now - createdTime) < 1200000; 
    }
    return false; // Pending and old? Ignore it.
  });

  // 4. Calculate Availability
  const bookedSlots: string[] = []
  
  // Helper for SAST Date
  const getSlotTimeDate = (dateStr: string, timeStr: string) => {
    return new Date(`${dateStr}T${timeStr}:00+02:00`); 
  }

  slots.forEach((time) => {
    const slotStart = getSlotTimeDate(date, time).getTime();
    const slotEnd = slotStart + (30 * 60 * 1000); 

    // Count VALID bookings in this slot
    const activeCount = validBookings.filter((b) => {
      const bStart = new Date(b.slot_start).getTime();
      const bEnd = new Date(b.slot_end).getTime();
      return bStart < slotEnd && bEnd > slotStart;
    }).length;

    // CHECK: Is it 3 or more?
    if (activeCount >= 3) {
      bookedSlots.push(time)
    }
  })

  return NextResponse.json({ bookedSlots })
}
