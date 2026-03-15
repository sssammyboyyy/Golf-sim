export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Query information_schema to get column details for 'bookings' table
    // Note: RLS might block this for anon key if not granted. 
    // But usually we can't query information_schema easily with anon key.
    // Instead, let's try to insert a dummy row and catch the error, 
    // OR just select ONE row and see the shape.

    const { data: sample, error: sampleError } = await supabase
        .from("bookings")
        .select("*")
        .limit(1)

    // Also try to get constraints if possible (hard with Supabase JS client)

    return NextResponse.json({
        sample_row_keys: sample && sample[0] ? Object.keys(sample[0]) : [],
        sample_error: sampleError
    })
}
