import { createClient } from "@supabase/supabase-js"
import { getOperatingHours, isClosedDay } from "@/lib/schedule-config"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")

  if (!date) {
    return Response.json({ error: "Date is required" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. Fetch ALL bookings (We need created_at to filter stale ones)
  // Also fetch simulator_id to track per-bay availability
  const { data: bookings, error } = await supabase
    .from("bookings_test")
    .select("slot_start, slot_end, status, created_at, simulator_id")
    .eq("booking_date", date)
    .neq("status", "cancelled")

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // 2. Check if day is closed
  if (isClosedDay(date)) {
    // Generate full day slots to force UI to grey them out (defensive)
    const allSlots: string[] = []
    for (let h = 6; h <= 22; h++) {
      allSlots.push(`${h.toString().padStart(2, "0")}:00`)
      allSlots.push(`${h.toString().padStart(2, "0")}:30`)
    }
    return Response.json({ bookedSlots: allSlots, closed: true, message: "The Mulligan is closed on this date" })
  }

  // 3. Define operating hours dynamically
  const hours = getOperatingHours(new Date(date))
  if (!hours) {
    // Same fallback if getOperatingHours returns null (implicit closed)
    const allSlots: string[] = []
    for (let h = 6; h <= 22; h++) {
      allSlots.push(`${h.toString().padStart(2, "0")}:00`)
      allSlots.push(`${h.toString().padStart(2, "0")}:30`)
    }
    return Response.json({ bookedSlots: allSlots, closed: true, message: "The Mulligan is closed on this date" })
  }

  const slots: string[] = []
  for (let h = hours.open; h < hours.close; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`)
    slots.push(`${h.toString().padStart(2, "0")}:30`)
  }

  // 3. Filter "Ghost" Bookings
  // A booking is valid if it is CONFIRMED OR if it is PENDING but created < 20 mins ago
  const now = Date.now();
  const validBookings = (bookings || []).filter(b => {
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

  // Return with cache-busting headers to ensure fresh data after time extensions
  return Response.json({ bookedSlots }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}
