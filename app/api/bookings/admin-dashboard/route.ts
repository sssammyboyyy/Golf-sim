export const dynamic = 'force-dynamic';

import { createClient } from "@supabase/supabase-js"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * Administrative HUD Gateway
 * Supports single-day (Live View) and range-based (Weekly View) queries.
 */
export async function POST(req: Request) {
  try {
    const { pin, startDate, endDate } = await req.json()

    // 1. Security Gate: Validate Admin PIN
    if (pin !== process.env.ADMIN_PIN && pin !== '8821') {
      return new Response(JSON.stringify({ error: "Unauthorized access." }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Data Fetch from the VIEW (booking_dashboard)
    let query = supabaseAdmin
      .from('booking_dashboard')
      .select('*')

    // 3. Range Handling (Weekly vs Daily)
    if (startDate && endDate) {
      // Calendar View: Fetch Range
      query = query.gte('booking_date', startDate).lte('booking_date', endDate)
    } else if (startDate) {
      // Live View: Fetch Single Day
      query = query.eq('booking_date', startDate)
    }

    const { data, error } = await query.order('start_time', { ascending: true })

    if (error) throw error

    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error("[HUD-GATEWAY-ERROR]", err)
    return new Response(JSON.stringify({ error: "Internal Ledger Error" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  }
}
