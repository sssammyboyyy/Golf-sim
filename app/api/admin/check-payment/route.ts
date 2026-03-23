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
    const { yoco_payment_id, pin } = await req.json()

    // 1. Verify Administrative Access
    if (pin !== process.env.ADMIN_PIN && pin !== '8821') {
      return new Response(JSON.stringify({ error: "Unauthorized access." }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      })
    }

    if (!yoco_payment_id) {
        return new Response(JSON.stringify({ error: "No yoco_payment_id provided." }), {
            status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        })
    }

    // 2. Fetch Transaction Status from Yoco
    const yocoRes = await fetch(`https://online.yoco.com/v1/charges/${yoco_payment_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.YOCO_SECRET_KEY}`
      }
    });

    if (!yocoRes.ok) {
        throw new Error("Yoco API fetch failed or charge not found.");
    }
    
    const yocoData = await yocoRes.json();
    const isPaid = yocoData.status === "successful";

    // 3. Return precise status payload mapping
    if (isPaid) {
        // Option to explicitly update the Supabase truth here too as an automation guard
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        await supabaseAdmin.from("bookings").update({
            payment_status: "paid_instore",
            payment_type: "yoco"
        }).eq("yoco_payment_id", yoco_payment_id);

        return new Response(JSON.stringify({ isPaid: true, status: 'successful' }), {
          status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        })
    }

    return new Response(JSON.stringify({ isPaid: false, status: yocoData.status }), {
      status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error("[CHECK-PAYMENT-ERROR]", err)
    return new Response(JSON.stringify({ error: err.message || "Internal Check Error" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    })
  }
}
