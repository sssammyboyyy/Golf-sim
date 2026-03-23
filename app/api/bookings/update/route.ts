import { createClient } from "@supabase/supabase-js"
import { createSASTTimestamp, addHoursToSAST } from "@/lib/utils"
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // 🛡️ SECURITY GATE
    if (pin !== process.env.ADMIN_PIN && pin !== '8821') {
      return new Response(JSON.stringify({ error: "Unauthorized access denied." }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ALLOWED_COLUMNS = [
      "guest_name", "guest_phone", "guest_email", "simulator_id",
      "player_count", "duration_hours", "notes", "addon_club_rental",
      "addon_coaching", "addon_water_qty", "addon_water_price",
      "addon_gloves_qty", "addon_gloves_price", "addon_balls_qty",
      "addon_balls_price", "payment_type", "payment_status", "status", "total_price",
      "manual_price_override", "amount_paid"
    ];

    const cleanPayload: any = Object.keys(updates)
      .filter(key => ALLOWED_COLUMNS.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (updates.duration_hours && updates.booking_date && updates.start_time) {
      cleanPayload.slot_start = createSASTTimestamp(updates.booking_date, updates.start_time);
      cleanPayload.slot_end = addHoursToSAST(cleanPayload.slot_start, Number(updates.duration_hours));
    }

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

    // NATIVE RESEND EMAIL LOGIC
    if (data.status === 'confirmed') {
      const email = data.guest_email?.trim();
      const isFakeEmail = !email || email.toLowerCase() === 'walkin@venue-os.com';

      if (!isFakeEmail) {
        const total = Number(data.total_price || 0);
        const paid = Number(data.amount_paid || 0);
        const due = Math.max(0, total - paid);
        
        const bayName = data.simulator_id === 1 ? 'Lounge Bay' : data.simulator_id === 2 ? 'Middle Bay' : data.simulator_id === 3 ? 'Window Bay' : `Bay ${data.simulator_id}`;

        try {
          await resend.emails.send({
            from: 'The Mulligan <bookings@the-mulligan.com>',
            to: email,
            subject: `Booking Confirmed: ${data.guest_name} at The Mulligan`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #059669;">Booking Confirmed!</h2>
                <p>Hi ${data.guest_name}, your simulator session at The Mulligan is locked in.</p>
                <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Date:</strong> ${data.booking_date}</p>
                  <p><strong>Time:</strong> ${data.start_time} for ${data.duration_hours} hour(s)</p>
                  <p><strong>Bay:</strong> ${bayName}</p>
                  <p><strong>Players:</strong> ${data.player_count}</p>
                </div>
                <h3>Financial Summary</h3>
                <p><strong>Total Price:</strong> R ${total}</p>
                <p><strong>Amount Paid:</strong> R ${paid}</p>
                <h3 style="color: #dc2626;">Amount Due at Venue: R ${due}</h3>
                <p style="margin-top: 30px; font-size: 12px; color: #71717a;">The Mulligan Venue OS System</p>
              </div>
            `
          });
        } catch (emailErr) {
          console.error("Resend Email Trigger Failed:", emailErr);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, booking: data }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("Update API Crash:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  }
}