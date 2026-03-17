import { createClient } from "@supabase/supabase-js"
import { createSASTTimestamp, addHoursToSAST } from "@/lib/utils"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export const runtime = "edge"; // High-leverage Cloudflare performance
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

/**
 * Admin Walk-In Creation Route
 * Bypasses RLS via Service Role & Normalizes Check Constraints
 */
export async function POST(req: Request) {
  try {
    // 1. Initialize with Service Role to ensure admin authority
    // Note: Ensure SUPABASE_SERVICE_ROLE_KEY is set in Cloudflare Dashboard
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const body = await req.json()
    const {
      full_name,
      phone,
      email,
      bay_id,
      booking_date,
      start_time,
      duration_hours,
      players,
      amount_total,
      status // Expected "CONFIRMED" from your UI
    } = body

    // 2. Industrial Timestamp Normalization (SAST)
    const slot_start = createSASTTimestamp(booking_date, start_time)
    const slot_end = addHoursToSAST(slot_start, Number(duration_hours))

    // 3. Construct Payload with Check-Constraint Fixes
    const finalPayload = {
      full_name,
      phone,
      email: email || null,
      bay_id,
      booking_date,
      start_time,
      slot_start,
      slot_end,
      duration_hours: Number(duration_hours),
      players: Number(players),
      total_price: amount_total || 0,
      status: (status || 'confirmed').toLowerCase(),
      payment_status: 'paid',
      // FIX: Database check constraint 'bookings_payment_type_check' 
      // likely expects 'cash', 'card', or 'eft'. 'walk_in' is usually rejected.
      payment_type: 'cash',
      booking_source: 'walk_in',
      user_type: 'guest'
    }

    // 4. Atomic Insert
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert([finalPayload])
      .select()
      .single()

    if (error) {
      console.error("[DB-ERROR]", error)
      return new Response(JSON.stringify({
        error: error.message,
        hint: "Check if payment_type 'cash' is allowed in your Postgres constraint."
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ success: true, booking: data }), {
      status: 201,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })

  } catch (err: any) {
    console.error("[FATAL-ERROR]", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
}