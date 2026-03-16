import { createClient } from "@supabase/supabase-js"
import { createSASTTimestamp, addHoursToSAST } from "@/lib/utils"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export const dynamic = "force-dynamic"

/**
 * Pre-flight handler for industrial Edge compliance.
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

/**
 * Golden Logic: Booking Route
 * Implements: Native Responses, SAST Normalization, Idempotency, and Concurrency Guards.
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const body = await req.json()
    const { 
      booking_request_id,
      booking_date, 
      start_time, 
      duration_hours,
      simulator_id,
      guest_name,
      guest_email,
      guest_phone
    } = body

    // 1. Validate mandatory fields
    if (!booking_request_id || !booking_date || !start_time || !simulator_id) {
      return new Response(JSON.stringify({ error: "Missing required booking parameters." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // 2. Industrial Timestamp Normalization (SAST)
    const slot_start = createSASTTimestamp(booking_date, start_time)
    const slot_end = addHoursToSAST(slot_start, Number(duration_hours))

    // 3. Database Execution with Atomics
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        booking_request_id, // Idempotency Guard (Unique UUID)
        booking_date,
        start_time,
        slot_start,
        slot_end,
        duration_hours,
        simulator_id,
        guest_name,
        guest_email,
        guest_phone,
        status: "pending",
        payment_status: "pending",
        user_type: "guest",
        booking_source: "online"
      })
      .select()
      .single()

    if (error) {
      // 4. Concurrency & Conflict Protection
      // 23P01: Postgres Exclusion Constraint violation (Double Booking)
      // 23505: Unique violation (Duplicate Request)
      if (error.code === "23P01" || error.code === "23505") {
        return new Response(JSON.stringify({ 
          error: "Slot conflict or duplicate request detected.", 
          code: error.code 
        }), {
          status: 409,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        })
      }
      throw error
    }

    // 5. Return Native Edge Response
    return new Response(JSON.stringify({ success: true, booking }), {
      status: 201,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })

  } catch (err: any) {
    console.error("[MULLIGAN-EDGE] Fatal Error:", err)
    return new Response(JSON.stringify({ 
      error: err.message || "Internal server error",
      request_id: crypto.randomUUID()
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
}
