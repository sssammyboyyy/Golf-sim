import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Lazy load the client - will throw here if env vars are missing
    const supabaseAdmin = getSupabaseAdmin();

    const now = new Date();
    const startOfDay = new Date(now).setHours(0,0,0,0);
    const endOfDay = new Date(now).setHours(23,59,59,999);

    const { data: activeBookings, error } = await supabaseAdmin
      .from("bookings_test")
      .select("simulator_id, slot_start, slot_end, status")
      .neq("status", "cancelled") 
      .gte("slot_end", new Date(startOfDay).toISOString())
      .lte("slot_start", new Date(endOfDay).toISOString());

    if (error) throw error;

    const nowMs = now.getTime();
    const currentLiveBookings = activeBookings?.filter((b: any) => {
      const startMs = new Date(b.slot_start).getTime();
      const endMs = new Date(b.slot_end).getTime();
      return startMs <= nowMs && endMs > nowMs;
    }) || [];

    const occupiedIds = currentLiveBookings.map((b: any) => b.simulator_id);

    const bays = [1, 2, 3].map((id) => ({
      id,
      status: occupiedIds.includes(id) ? "occupied" : "available",
      label: `Simulator ${id}`
    }));

    const availableCount = bays.filter((b) => b.status === "available").length;

    return NextResponse.json(
      { 
        bays, 
        availableCount,
        serverTime: now.toISOString()
      }, 
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        }
      }
    );

  } catch (error: any) {
    console.error("API Failure (Status):", error.message);
    
    const statusCode = error.message.includes('Legacy API keys') ? 401 : 500;
    
    return NextResponse.json(
      { 
        error: "Configuration or Database Error", 
        details: error.message || "An unexpected error occurred."
      }, 
      { status: statusCode }
    );
  }
}
