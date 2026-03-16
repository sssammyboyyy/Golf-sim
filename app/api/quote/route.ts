import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';


export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { players, duration, sessionType } = await request.json();
    
    // Lazy load the client - will throw here if env vars are missing
    const supabaseAdmin = getSupabaseAdmin();

    const { data: price, error } = await supabaseAdmin
      .rpc('get_price', {
        p_players: players,
        p_duration: duration,
        p_session_type: sessionType
      });

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
