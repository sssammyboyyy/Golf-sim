import { NextResponse } from "next/server"

// 1. Force Edge Runtime
export const runtime = "edge"

export async function GET() {
  // CONFIG: Replace with your actual n8n Webhook URL
  const N8N_WEBHOOK_URL = "https://n8n.srv1127912.hstgr.cloud/webhook/payment-webhook"
  
  // Uses the key from your Cloudflare Env
  const YOCO_KEY = process.env.YOCO_SECRET_KEY

  if (!YOCO_KEY) {
    return NextResponse.json({ error: "No YOCO_SECRET_KEY found" }, { status: 500 })
  }

  try {
    const response = await fetch("https://payments.yoco.com/api/webhooks", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${YOCO_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "N8N Automation",
        url: N8N_WEBHOOK_URL
      }),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
