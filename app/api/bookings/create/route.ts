import { NextResponse, NextRequest } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/client"
import { getOperatingHours, isClosedDay } from "@/lib/schedule-config"
import { createSASTTimestamp, addHoursToSAST } from "@/lib/utils"

// addHoursToTimestamp replaced by addHoursToSAST from @/lib/utils

function calculateEndTimeText(start: string, duration: number): string {
  const [hours, minutes] = start.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  date.setHours(date.getHours() + duration)
  return date.toTimeString().slice(0, 5)
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs" // Explicitly using nodejs for now to avoid edge conflicts if any remain

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const bookingData = await request.json()

    // 1. EXTRACT DATA
    const {
      booking_date,
      start_time,
      duration_hours,
      total_price,
      guest_name,
      guest_email,
      guest_phone,
      payment_status,
    } = bookingData

    // 2. VALIDATE SCHEDULE (Closed Days & Trading Hours)
    if (isClosedDay(booking_date)) {
      return NextResponse.json(
        { error: "The Mulligan is closed on this date." },
        { status: 400 }
      )
    }

    const operatingHours = getOperatingHours(new Date(booking_date))
    if (!operatingHours) {
      return NextResponse.json(
        { error: "The Mulligan is closed on this date." },
        { status: 400 }
      )
    }

    // 2. CALCULATE TIMES
    const slotStartISO = createSASTTimestamp(booking_date, start_time)
    const slotEndISO = addHoursToSAST(slotStartISO, duration_hours)
    const endTimeText = calculateEndTimeText(start_time, duration_hours)

    // Convert requested times to Milliseconds for safe comparison
    const reqStartMs = new Date(slotStartISO).getTime()
    const reqEndMs = new Date(slotEndISO).getTime()

    // 2b. VALIDATE OPERATING HOURS (Hard Close)
    const openIso = `${booking_date}T${operatingHours.open.toString().padStart(2, '0')}:00:00+02:00`
    const closeIso = `${booking_date}T${operatingHours.close.toString().padStart(2, '0')}:00:00+02:00`
    const openTimeMs = new Date(openIso).getTime()
    const closeTimeMs = new Date(closeIso).getTime()

    if (reqStartMs < openTimeMs || reqEndMs > closeTimeMs) {
      return NextResponse.json(
        { error: `Booking must be between ${operatingHours.open}:00 and ${operatingHours.close}:00` },
        { status: 400 }
      )
    }

    // 3. CHECK AVAILABILITY (MULTI-BAY LOGIC)
    const { data: dailyBookings } = await supabase
      .from("bookings")
      .select("simulator_id, slot_start, slot_end")
      .eq("booking_date", booking_date)
      .neq("status", "cancelled")

    const takenBays = new Set<number>()

    if (dailyBookings) {
      dailyBookings.forEach((b) => {
        const existStartMs = new Date(b.slot_start).getTime()
        const existEndMs = new Date(b.slot_end).getTime()
        const isOverlapping = existStartMs < reqEndMs && existEndMs > reqStartMs

        if (isOverlapping) {
          takenBays.add(b.simulator_id)
        }
      })
    }

    // 4. ASSIGN BAY (1 -> 2 -> 3)
    let assignedSimulatorId = 0
    if (!takenBays.has(1)) assignedSimulatorId = 1
    else if (!takenBays.has(2)) assignedSimulatorId = 2
    else if (!takenBays.has(3)) assignedSimulatorId = 3

    if (assignedSimulatorId === 0) {
      return NextResponse.json(
        { error: "All 3 Simulators are busy for this time slot." },
        { status: 409 }
      )
    }

    // 5. INSERT BOOKING
    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        booking_date,
        start_time,
        end_time: endTimeText,
        slot_start: slotStartISO,
        slot_end: slotEndISO,
        duration_hours,
        simulator_id: assignedSimulatorId,
        user_type: "walk_in",
        guest_name: guest_name || "Walk-In Guest",
        guest_email,
        guest_phone,
        total_price,
        status: bookingData.booking_source === "walk_in" ? "confirmed" : (payment_status === "completed" ? "confirmed" : "pending"),
        payment_status: payment_status === "completed" ? "paid_instore" : "pending",
        booking_source: bookingData.booking_source || "walk_in",
        player_count: bookingData.players || 1,
        session_type: bookingData.session_type || "quick",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // SAST timestamps are enforced via slot_start/slot_end above
      })
      .select()
      .single()

    if (insertError) {
      // 23P01 = EXCLUSION_VIOLATION (Double booking race condition)
      // MULLIGAN PROTOCOL: purge ghosts → wait 200ms → retry once → 409
      if (insertError.code === '23P01' || insertError.message?.includes('exclusion constraint')) {
        console.warn(`[23P01] Race condition on Bay ${assignedSimulatorId} at ${start_time}. Purging ghosts...`);

        // Step 1: Purge ghost rows for this bay
        const { error: purgeError } = await supabase
          .from("bookings")
          .delete()
          .eq("booking_date", booking_date)
          .eq("simulator_id", assignedSimulatorId)
          .neq("status", "confirmed")

        if (purgeError) {
          console.error(`[23P01] Ghost purge failed:`, purgeError.message);
          return NextResponse.json(
            { error: "Slot unavailable. Please select another time.", error_code: "SLOT_RACE_CONDITION" },
            { status: 409 }
          );
        }

        // Step 2: Wait 200ms for constraint release
        await new Promise(resolve => setTimeout(resolve, 200));

        // Step 3: Retry insert once
        const { data: retryBooking, error: retryError } = await supabase
          .from("bookings")
          .insert({
            booking_date,
            start_time,
            end_time: endTimeText,
            slot_start: slotStartISO,
            slot_end: slotEndISO,
            duration_hours,
            simulator_id: assignedSimulatorId,
            user_type: "walk_in",
            guest_name: guest_name || "Walk-In Guest",
            guest_email,
            guest_phone,
            total_price,
            status: bookingData.booking_source === "walk_in" ? "confirmed" : (payment_status === "completed" ? "confirmed" : "pending"),
            payment_status: payment_status === "completed" ? "paid_instore" : "pending",
            booking_source: bookingData.booking_source || "walk_in",
            player_count: bookingData.players || 1,
            session_type: bookingData.session_type || "quick",
          })
          .select()
          .single()

        if (retryBooking && !retryError) {
          console.log(`[23P01] Retry SUCCESS for Bay ${assignedSimulatorId}`);
          return NextResponse.json({ success: true, booking_id: retryBooking.id, assigned_bay: assignedSimulatorId })
        }

        // Step 4: Final failure → 409
        return NextResponse.json(
          { error: "Slot unavailable after retry. Please select another time.", error_code: "SLOT_RACE_CONDITION" },
          { status: 409 }
        );
      }

      console.error("Walk-in Insert Error:", insertError)
      return NextResponse.json({
        error: "Failed to create booking",
        details: insertError.message || insertError
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, booking_id: booking.id, assigned_bay: assignedSimulatorId })

  } catch (error: any) {
    console.error("Walk-in Server Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
