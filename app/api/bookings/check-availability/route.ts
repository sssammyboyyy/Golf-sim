import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic';

import { isClosedDay, getOperatingHours } from "@/lib/schedule-config"

// Helper to match the rest of your app's logic
function createSASTTimestamp(dateStr: string, timeStr: string): string {
  const cleanTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${cleanTime}+02:00`;
}

function addHoursToTimestamp(timestamp: string, hours: number): string {
  const date = new Date(timestamp);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { booking_date, start_time, duration_hours } = await request.json()

    // 0. CHECK SCHEDULE
    if (isClosedDay(booking_date)) {
      return Response.json({
        available: false,
        reason: "closed",
        message: "The Mulligan is closed on this date"
      })
    }

    const operatingHours = getOperatingHours(new Date(booking_date))
    if (!operatingHours) {
      return Response.json({ available: false, message: "Closed on this date" })
    }

    const startHour = parseInt(start_time.split(':')[0])
    const endHour = startHour + duration_hours
    if (startHour < operatingHours.open || endHour > operatingHours.close) {
      return Response.json({ available: false, message: "Outside operating hours" })
    }

    // 1. Calculate Exact ISO Timestamps (Consistency is key!)
    const requestedStartISO = createSASTTimestamp(booking_date, start_time);
    const requestedEndISO = addHoursToTimestamp(requestedStartISO, duration_hours);

    // 2. Fetch Active Bookings for that day
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("slot_start, slot_end") // Only fetch what we need
      .eq("booking_date", booking_date)
      .neq("status", "cancelled")

    if (error) {
      console.error("Availability Check DB Error:", error);
      return Response.json({ error: "Database check failed" }, { status: 500 });
    }

    // 3. Count Overlaps in JavaScript (Precise & Fast)
    // A booking overlaps if: (StartA < EndB) and (EndA > StartB)
    let overlapCount = 0;

    if (bookings) {
      bookings.forEach(b => {
        if (b.slot_start < requestedEndISO && b.slot_end > requestedStartISO) {
          overlapCount++;
        }
      });
    }

    // 4. Compare against Capacity
    const TOTAL_BAYS = 3
    const isAvailable = overlapCount < TOTAL_BAYS

    return Response.json({
      available: isAvailable,
      conflicting_bookings: overlapCount,
      capacity: TOTAL_BAYS
    })

  } catch (error) {
    console.error("Availability Check Server Error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
