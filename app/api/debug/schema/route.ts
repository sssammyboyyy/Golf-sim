export const dynamic = "force-dynamic"

import { createClient } from "@supabase/supabase-js"

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: sample, error: sampleError } = await supabase
        .from("bookings")
        .select("*")
        .limit(1)

    return Response.json({
        sample_row_keys: sample && sample[0] ? Object.keys(sample[0]) : [],
        sample_error: sampleError
    })
}
