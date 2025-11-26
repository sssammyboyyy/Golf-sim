import { NextResponse } from "next/server"

// 1. Force Edge Runtime
export const runtime = "edge"

export async function GET() {
  // --- CONFIGURATION ---
  // REPLACE THIS with your actual n8n Production Webhook URL
  const N8N_WEBHOOK_URL = "https://n8n.srv1127912.hstgr.cloud/webhook/payment-webhook"
  
  // We use the Secret Key already in your Cloudflare Env
  const YOCO_KEY = process.env.YOCO_SECRET_KEY

  if (!YOCO_KEY) {
    return NextResponse.json({ error: "No YOCO_SECRET_KEY found in env" }, { status: 500 })
  }

  try {
    // 2. Call Yoco API to Register the Webhook
    const response = await fetch("https://payments.yoco.com/api/webhooks", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${YOCO_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "N8N Automation",
        url: https://n8n.srv1127912.hstgr.cloud/webhook/payment-webhook
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ 
        error: "Yoco Refused", 
        details: data 
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: "Webhook Registered Successfully!",
      yoco_response: data
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
