import { getSupabaseAdmin } from '@/lib/supabase/client'
import { createSASTTimestamp } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { id, pin } = await req.json()

    // 1. Authorization Check
    if (pin !== "8821") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!id) {
      return Response.json({ error: "Missing ID" }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 2. Soft Delete via supabaseAdmin (bypasses RLS)
    const nowSAST = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Johannesburg' }).replace(' ', 'T') + '+02:00'
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: nowSAST,
        updated_at: nowSAST
      })
      .eq('id', id)

    if (error) {
      console.error("Soft delete failed:", error)
      return Response.json({ error: "Failed to delete booking" }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (error: any) {
    console.error("Delete error:", error)
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
