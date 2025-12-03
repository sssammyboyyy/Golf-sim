import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const { players, duration, sessionType } = await request.json()
    const supabase = await createClient()

    // Call the SQL function we just created
    const { data: price, error } = await supabase
      .rpc('get_price', {
        p_players: players,
        p_duration: duration,
        p_session_type: sessionType
      })

    if (error) throw error

    return NextResponse.json({ price })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
