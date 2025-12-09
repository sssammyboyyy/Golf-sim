import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = "edge"

export async function POST(req: Request) {
    try {
        const {
            id,
            pin,
            updates
        } = await req.json()

        // 1. Auth Check
        if (pin !== "8821") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!id || !updates) {
            return NextResponse.json({ error: "Missing ID or Update Data" }, { status: 400 })
        }

        // 2. Initialize Admin Client (Bypasses RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 3. Update
        const { error } = await supabaseAdmin
            .from("bookings")
            .update(updates)
            .eq("id", id)

        if (error) {
            console.error("Update Error:", error)
            throw error
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
