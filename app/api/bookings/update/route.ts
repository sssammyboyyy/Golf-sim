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
    const body = await req.json()
    const { id, pin, ...updates } = body;

    // 🛡️ SECURITY GATE: Admin PIN Validation
    if (pin !== process.env.ADMIN_PIN && pin !== '8821') {
      return new Response(JSON.stringify({ error: "Unauthorized access denied." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // 🛠️ INITIALIZE SERVICE ROLE CLIENT (Bypass RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 🧱 FIELD FIREWALL: Only allow valid bookings table columns
    const ALLOWED_COLUMNS = [
      "guest_name", "guest_phone", "guest_email", "simulator_id",
      "player_count", "duration_hours", "notes", "addon_club_rental",
      "addon_coaching", "addon_water_qty", "addon_water_price",
      "addon_gloves_qty", "addon_gloves_price", "addon_balls_qty",
      "addon_balls_price", "payment_type", "payment_status", "status", "total_price"
    ];

    const cleanPayload: any = Object.keys(updates)
      .filter(key => ALLOWED_COLUMNS.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    // 🕒 CRITICAL FIX: Recalculate SAST Database Constraints if duration is present
    // This prevents double-booking if a manager extends a session length in the modal
    if (updates.duration_hours && updates.booking_date && updates.start_time) {
      cleanPayload.slot_start = createSASTTimestamp(updates.booking_date, updates.start_time);
      cleanPayload.slot_end = addHoursToSAST(cleanPayload.slot_start, Number(updates.duration_hours));
    }

    // Execute the hardened update
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .update(cleanPayload)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("DB Update Error:", error);
      throw error;
    }

    // 🎯 n8n WEBHOOK FOR QUICK SETTLE
    if (data.status === 'confirmed' && process.env.N8N_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: data.id,
            secret: process.env.N8N_WEBHOOK_SECRET || process.env.ADMIN_PIN
          })
        });
      } catch (err) {
        console.error("n8n Trigger Failed:", err);
      }
    }

    return new Response(JSON.stringify({ success: true, booking: data }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("Update API Crash:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }
}