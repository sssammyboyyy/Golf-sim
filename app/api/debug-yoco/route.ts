import { NextResponse } from "next/server"

export const runtime = "edge"

export async function GET() {
  const YOCO_KEY = process.env.YOCO_SECRET_KEY

  if (!YOCO_KEY) return NextResponse.json({ error: "No Key Found" })

  try {
    // GET request to list all webhooks
    const response = await fetch("https://payments.yoco.com/api/webhooks", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${YOCO_KEY}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    
    return NextResponse.json({
      status: response.status,
      webhooks: data
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message })
  }
}
