import { createClient } from "@supabase/supabase-js"
import { createSASTTimestamp, addHoursToSAST } from "@/lib/utils"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    
    // Data Sanitization
    const players = Math.min(Math.max(Number(body.player_count || 1), 1), 4);
    const duration = Number(body.duration_hours || 1);
    const slotStart = createSASTTimestamp(body.booking_date, body.start_time);
    const slotEnd = addHoursToSAST(slotStart, duration);

    // Pricing Math with Manager Overrides
    const rates = { 1: 250, 2: 360, 3: 480, 4: 600 };
    const baseTotal = (rates[players as keyof typeof rates] || 250) * duration;
    
    const clubs = body.addon_club_rental ? (100 * duration) : 0;
    const coaching = body.addon_coaching ? 250 : 0;
    
    // Manager persistence logic: qty * (override_price ?? standard_price)
    const water = (body.addon_water_qty || 0) * (body.addon_water_price ?? 20);
    const gloves = (body.addon_gloves_qty || 0) * (body.addon_gloves_price ?? 220);
    const balls = (body.addon_balls_qty || 0) * (body.addon_balls_price ?? 50);

    const calculatedTotal = baseTotal + clubs + coaching + water + gloves + balls;

    const finalPayload = {
      guest_name: body.guest_name || 'Walk-in Guest',
      guest_phone: body.guest_phone || '0000000000',
      guest_email: body.guest_email || 'walkin@venue-os.com',
      simulator_id: Number(body.simulator_id), 
      booking_date: body.booking_date,
      start_time: body.start_time,
      slot_start: slotStart,
      slot_end: slotEnd,
      duration_hours: duration,
      player_count: players,
      total_price: calculatedTotal,
      notes: body.notes || "",
      payment_type: body.payment_type || 'cash', 
      booking_source: 'walk_in',
      user_type: 'walk_in',
      // Persist the specific prices typed by the manager
      addon_water_qty: Number(body.addon_water_qty || 0),
      addon_water_price: Number(body.addon_water_price ?? 20),
      addon_gloves_qty: Number(body.addon_gloves_qty || 0),
      addon_gloves_price: Number(body.addon_gloves_price ?? 220),
      addon_balls_qty: Number(body.addon_balls_qty || 0),
      addon_balls_price: Number(body.addon_balls_price ?? 50),
      addon_club_rental: Boolean(body.addon_club_rental),
      addon_coaching: Boolean(body.addon_coaching)
    }

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert([finalPayload])
      .select().single()

    if (error) {
      // 23P01 = EXCLUSION_VIOLATION — Mulligan Protocol: purge → wait 200ms → retry → 409
      if (error.code === '23P01' || error.message?.includes('exclusion constraint')) {
        console.warn(`[23P01] Admin-create race on Bay ${body.simulator_id}. Purging ghosts...`);

        // Step 1: Purge non-confirmed rows for this bay on this date
        await supabaseAdmin
          .from("bookings")
          .delete()
          .eq("booking_date", body.booking_date)
          .eq("simulator_id", Number(body.simulator_id))
          .neq("status", "confirmed")

        // Step 2: Wait 200ms
        await new Promise(resolve => setTimeout(resolve, 200));

        // Step 3: Retry once
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from("bookings")
          .insert([finalPayload])
          .select().single()

        if (retryData && !retryError) {
          console.log(`[23P01] Admin retry SUCCESS for Bay ${body.simulator_id}`);
          return new Response(JSON.stringify({ success: true, booking: retryData }), {
            status: 201, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          })
        }

        // Step 4: Final failure
        return new Response(JSON.stringify({ error: "Slot unavailable after retry.", error_code: "SLOT_RACE_CONDITION" }), {
          status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        })
      }

      throw error;
    }

    return new Response(JSON.stringify({ success: true, booking: data }), {
      status: 201, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  } catch (err: any) {
    console.error("[ADMIN-CREATE-ERROR]", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  }
}
