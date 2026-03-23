import { createClient } from "@supabase/supabase-js"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: Request) {
  try {
    const { code } = await req.json()

    if (!code) {
      return new Response(JSON.stringify({ error: "Missing coupon code." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Query specific table. If users request coupons from `bookings`, fallback to standard `coupons` table architecture.
    const { data: coupon, error } = await supabaseAdmin
        .from('coupons')
        .select('discount_percentage, discount_amount')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

    if (error || !coupon) {
        return new Response(JSON.stringify({ error: "Invalid or expired coupon" }), {
            status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        })
    }

    return new Response(JSON.stringify({ 
        discount_percentage: coupon.discount_percentage || 0,
        discount_amount: coupon.discount_amount || 0
    }), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error("[COUPONS-VALIDATE-ERROR]", err)
    return new Response(JSON.stringify({ error: "Internal Validation Error" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  }
}
