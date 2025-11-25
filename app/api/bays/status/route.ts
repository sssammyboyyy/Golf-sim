import { NextResponse } from "next/server"

export const runtime = 'edge';

export async function GET() {
  try {
    // In production, this would query the database for real-time bay status
    const bays = [
      { id: 1, status: "available", name: "Bay 1" },
      { id: 2, status: "occupied", name: "Bay 2" },
      { id: 3, status: "available", name: "Bay 3" },
    ]

    return NextResponse.json({ bays })
  } catch (error) {
    console.error("[v0] Bay status error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bay status" },
      { status: 500 }
    )
  }
}
