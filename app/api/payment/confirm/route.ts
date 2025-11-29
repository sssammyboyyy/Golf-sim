import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. CONFIGURATION
    // Add these to your .env.local file!
    const N8N_URL = "https://n8n.srv1127912.hstgr.cloud/webhook/manual-confirm";
    const N8N_SECRET = "mulligan-secure-8821"; // Must match the string in n8n Code Node

    // 2. FORWARD TO N8N
    const n8nResponse = await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        secret: N8N_SECRET // Inject secret here, server-side
      }),
    });

    if (!n8nResponse.ok) {
      console.error("n8n Error:", await n8nResponse.text());
      return NextResponse.json({ error: "Failed to trigger automation" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Confirmation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
