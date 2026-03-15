export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const { players, duration, sessionType } = await request.json()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

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
