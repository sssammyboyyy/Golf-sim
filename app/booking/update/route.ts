import { createClient } from "@supabase/supabase-js"
import { createSASTTimestamp, addHoursToSAST } from "@/lib/utils"

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Kept as standard Node to satisfy OpenNext bundling rules
export const dynamic = "force-dynamic";

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    })
}

/**
 * Admin Update Route
 * Handles edits to existing bookings (Walk-ins or Online)
 */
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { id } = body;

        if (!id) {
            return new Response(JSON.stringify({ error: "Booking ID is required for updates." }), {
                status: 400,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            })
        }

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

        // 1. Recalculate SAST Timestamps in case duration was changed
        const slot_start = createSASTTimestamp(body.booking_date, body.start_time);
        const slot_end = addHoursToSAST(slot_start, Number(body.duration_hours));

        // 2. Construct Payload using strict schema names
        const updatePayload = {
            guest_name: body.guest_name,
            guest_phone: body.guest_phone,
            guest_email: body.guest_email,
            simulator_id: Number(body.simulator_id),
            player_count: Number(body.player_count),
            duration_hours: Number(body.duration_hours),
            slot_start: slot_start,
            slot_end: slot_end,
            notes: body.notes,

            // Add-ons & Retail
            addon_club_rental: Boolean(body.addon_club_rental),
            addon_coaching: Boolean(body.addon_coaching),
            addon_water_qty: Number(body.addon_water_qty || 0),
            addon_water_price: Number(body.addon_water_price || 20),
            addon_gloves_qty: Number(body.addon_gloves_qty || 0),
            addon_gloves_price: Number(body.addon_gloves_price || 220),
            addon_balls_qty: Number(body.addon_balls_qty || 0),
            addon_balls_price: Number(body.addon_balls_price || 50),

            // Billing & Status
            payment_type: body.payment_type,
            total_price: Number(body.total_price),
            status: body.status,
        }

        // 3. Execute Update
        const { data, error } = await supabaseAdmin
            .from("bookings")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single()

        if (error) {
            console.error("[UPDATE-DB-ERROR]", error)
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            })
        }

        return new Response(JSON.stringify({ success: true, booking: data }), {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        })

    } catch (err: any) {
        console.error("[UPDATE-FATAL]", err)
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        })
    }
}