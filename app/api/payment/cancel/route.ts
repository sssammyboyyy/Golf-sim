export const dynamic = "force-dynamic"

// Standard Response standardization
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { reference } = body

        if (!reference) {
            return Response.json({ error: "Missing reference" }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Verify it's still pending before cancelling
        const { data: booking, error: fetchError } = await supabase
            .from("bookings")
            .select("status, payment_status")
            .eq("id", reference)
            .single()

        if (fetchError || !booking) {
            return Response.json({ error: "Booking not found" }, { status: 404 })
        }

        if (booking.status === "cancelled" || booking.payment_status === "completed") {
            // Already handled
            return Response.json({ success: true, message: "Booking already processed" })
        }

        // Hard delete to free the slot entirely from the unique constraint
        const { error: deleteError } = await supabase
            .from("bookings")
            .delete()
            .eq("id", reference)

        if (deleteError) {
            throw new Error(deleteError.message)
        }

        return Response.json({ success: true, message: "Abandoned booking completely removed." })

    } catch (error: any) {
        console.error("Cancel Webhook Error:", error)
        return Response.json({ error: error.message }, { status: 500 })
    }
}
