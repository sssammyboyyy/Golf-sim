import { createClient } from "@supabase/supabase-js"
import { createSASTTimestamp, addHoursToSAST } from "@/lib/utils"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// FIX: Remove edge runtime to satisfy OpenNext bundling
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const { 
      booking_request_id, booking_date, start_time, 
      duration_hours, player_count, simulator_id,
      guest_name, guest_email, guest_phone
    } = body

    if (!booking_request_id || !booking_date || !start_time || !simulator_id) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      })
    }

    // Industrial SAST Normalization
    const slot_start = createSASTTimestamp(booking_date, start_time)
    const slot_end = addHoursToSAST(slot_start, Number(duration_hours))

    // Tiered Pricing Rule (Online Gate)
    const players = Math.min(Math.max(Number(player_count || 1), 1), 4);
    const duration = Number(duration_hours || 1);
    const rates = { 1: 250, 2: 360, 3: 480, 4: 600 };
    const totalPrice = (rates[players as keyof typeof rates] || 250) * duration;

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        booking_request_id, booking_date, start_time,
        slot_start, slot_end, simulator_id,
        guest_name, guest_email, guest_phone,
        duration_hours: duration,
        player_count: players,
        total_price: totalPrice,
        status: "pending",
        user_type: "guest",
        booking_source: "online"
      })
      .select().single()

    if (error) {
      if (error.code === "23P01" || error.code === "23505") {
        return new Response(JSON.stringify({ error: "Conflict", code: error.code }), {
          status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        })
      }
      throw error
    }

    return new Response(JSON.stringify({ success: true, booking }), {
      status: 201, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  } catch (err: any) {
    console.error("[BOOKING-POST-ERROR]", err)
    return new Response(JSON.stringify({ error: "Internal Error" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  }
}