export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { createClient } from "@supabase/supabase-js"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

/**
 * Admin Ghost Cleanup Route
 * Executes a hard-delete to immediately free up the PostgreSQL Exclusion Constraint
 */
export async function POST(req: Request) {
  try {
    const { id } = await req.json()

    if (!id) {
      return new Response(JSON.stringify({ error: "Booking ID is required for Ghost Cleanup." }), {
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

    // 1. Execute Hard Delete
    const { error } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[GHOST-CLEANUP-DB-ERROR]", error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // 2. Return Success
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })

  } catch (err: any) {
    console.error("[GHOST-CLEANUP-FATAL]", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
}
