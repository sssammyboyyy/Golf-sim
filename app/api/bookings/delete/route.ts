import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { id, pin } = await req.json()

    // 1. Authorization Check
    if (pin !== "8821") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 })
    }

    // 2. Soft Delete via supabaseAdmin (bypasses RLS)
    // We update the status to 'cancelled' and set the cancelled_at timestamp.
    // NOTE: n8n triggers only fire on INSERT then UPDATE where OLD.status='pending' AND NEW.status='confirmed'.
    // Moving to 'cancelled' will not trigger the confirmation workflow.
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error("Soft delete failed:", error)
      return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
