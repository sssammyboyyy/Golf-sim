import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Force this to run on the Edge
export const runtime = "edge"

export async function POST(req: Request) {
  try {
    const { id, pin } = await req.json()

    // 1. Basic Server-Side Security Check
    // We re-verify the PIN here so no one can just CURL this endpoint to delete data
    if (pin !== "8821") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: "Missing Booking ID" }, { status: 400 })
    }

    // 2. Initialize Supabase with SERVICE ROLE KEY (Bypasses RLS)
    // You must have SUPABASE_SERVICE_ROLE_KEY in your .env.local
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. Delete the booking
    const { error } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Delete Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
