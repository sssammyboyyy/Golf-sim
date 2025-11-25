import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coupon_code, booking_amount, session_type } = body

    if (!coupon_code) {
      return NextResponse.json({ valid: false, message: "Coupon code is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Query the coupons table
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", coupon_code.toUpperCase())
      .eq("is_active", true)
      .single()

    if (error || !coupon) {
      return NextResponse.json({ valid: false, message: "Invalid coupon code" }, { status: 200 })
    }

    // Check expiry date
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, message: "Coupon has expired" }, { status: 200 })
    }

    // Check usage limit
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json({ valid: false, message: "Coupon usage limit reached" }, { status: 200 })
    }

    // Calculate discount
    let discount_amount = 0
    if (coupon.discount_type === "percentage") {
      discount_amount = (booking_amount * coupon.discount_value) / 100
    } else if (coupon.discount_type === "fixed") {
      discount_amount = Math.min(coupon.discount_value, booking_amount)
    }

    // Increment usage count
    await supabase
      .from("coupons")
      .update({ current_uses: coupon.current_uses + 1 })
      .eq("id", coupon.id)

    return NextResponse.json({
      valid: true,
      discount_amount,
      message: `Coupon applied! You saved R${discount_amount.toFixed(2)}`,
    })
  } catch (error) {
    console.error("Coupon validation error:", error)
    return NextResponse.json({ valid: false, message: "Server error" }, { status: 500 })
  }
}
