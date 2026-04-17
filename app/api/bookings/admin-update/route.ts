import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// CRITICAL: DO NOT add edge runtime here. Keeping standard Node primitives for Cloudflare compatibility.

export async function PATCH(request: Request) {
  try {
    const { id, total_price, amount_due, pin } = await request.json();

    // 1. PIN Verification (Admin Gate)
    if (pin !== "8821") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    // 2. Initialize Elevated Client (RLS Bypass)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 3. Deterministic Mutation
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .update({
        total_price: Number(total_price),
        amount_due: Number(amount_due)
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Admin Update Error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[Admin Update Internal Error]:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
