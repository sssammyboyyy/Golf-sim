import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = "edge"

export async function POST(req: Request) {
  try {
    const { id, pin } = await req.json()

    // 1. Security Check
    if (pin !== "8821") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    // 2. Initialize Admin Client (Bypasses RLS)
    // This requires the SERVICE_ROLE_KEY in Cloudflare Dashboard
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. Delete
    const { error } = await supabaseAdmin
      .from("bookings")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
