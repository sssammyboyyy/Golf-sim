import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';


export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { players, duration, sessionType } = await request.json();
    
    // 1. Strict Type Coercion (Prevent RPC signature mismatches)
    const safePlayers = Number(players);
    const safeDuration = Number(duration);
    const safeSessionType = String(sessionType).trim();

    console.log(`[Pricing Telemetry] Executing get_price RPC:`, { 
      players: safePlayers, 
      duration: safeDuration, 
      type: safeSessionType 
    });

    // ELEVATED PRIVILEGES: Explicitly use Service Role Key for RLS Bypass
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: price, error } = await supabaseAdmin
      .rpc('get_price', {
        p_players: safePlayers,
        p_duration: safeDuration,
        p_session_type: safeSessionType
      });

    console.log(`[Pricing Telemetry] RPC Response:`, { data: price, error });

    if (error) throw error;

    return NextResponse.json({ status: 'success', price });

  } catch (error: any) {
    console.error("API Failure (Quote):", error.message);
    
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
