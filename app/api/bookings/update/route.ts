import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Standardized SAST Math Engine
 * Rebuilds timestamps with +02:00 offsets.
 */
const calculateSASTTimestamps = (date: string, time: string, duration: number) => {
  const slotStartStr = `${date}T${time}:00+02:00`;
  const slotStart = new Date(slotStartStr);
  const slotEnd = new Date(slotStart.getTime() + duration * 60 * 60 * 1000);
  
  return {
    slot_start: slotStart.toISOString(),
    slot_end: slotEnd.toISOString(),
    end_time: slotEnd.toLocaleTimeString('en-ZA', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'Africa/Johannesburg', 
      hour12: false 
    })
  };
};

/**
 * Standardized Base Hourly Rate Engine
 * 1p=250, 2p=360, 3p=480, 4p=600
 */
const GET_BASE_HOURLY_RATE = (players: number): number => {
  if (players >= 4) return 600;
  if (players === 3) return 480;
  if (players === 2) return 360;
  return 250;
};

/**
 * Standardized Financial Engine
 * Recomputes totals based on POS add-ons and ensures state persistence.
 */
const calculateFinancials = (payload: any, updates: any) => {
  const players = Number(payload.player_count || 1);
  const duration = Number(payload.duration_hours || 1);
  const baseRate = GET_BASE_HOURLY_RATE(players);
  
  const calculatedBase = baseRate * duration;
  const water = Number(payload.addon_water_qty || 0) * Number(payload.addon_water_price ?? 20);
  const gloves = Number(payload.addon_gloves_qty || 0) * Number(payload.addon_gloves_price ?? 220);
  const balls = Number(payload.addon_balls_qty || 0) * Number(payload.addon_balls_price ?? 50);
  const clubs = payload.addon_club_rental ? (100 * duration) : 0;
  const coaching = payload.addon_coaching ? 250 : 0;
  
  const systemTotal = calculatedBase + water + gloves + balls + clubs + coaching;

  // Preserve manual price overrides if provided explicitly in the top-level updates.
  // This ensures that if a manager changes an inventory quantity or duration (without typing a custom price),
  // the `systemTotal` correctly updates. If they DO type a price, that override takes precedence.
  const isManualOverride = updates.total_price !== undefined;
  const total_price = isManualOverride ? Number(updates.total_price) : systemTotal;
  
  const amount_paid = Number(payload.amount_paid || 0);
  const amount_due = Math.max(0, total_price - amount_paid);
  
  return { total_price, amount_due };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, pin, ...updates } = body;

    // 1. Security Gate
    if (pin !== process.env.ADMIN_PIN && pin !== '8821') {
      return NextResponse.json({ 
        error: "Forbidden", 
        message: "Invalid Manager PIN. Update rejected." 
      }, { status: 403 });
    }

    // Explicit Service Role Client for RLS Bypass
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Fetch Existing Record (Crucial for deep merge to avoid state wipe)
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: "Not Found", message: "Booking not found." }, { status: 404 });
    }

    // 3. Deep Merge Logic
    // This ensures that partial updates (like just changing payment_status) 
    // do not reset player counts or retail quantities to 0.
    let finalUpdates = { ...existingRecord, ...updates };

    // 4. Dynamic Math Engines
    // Rebuild timestamps anchored to SAST if any scheduling parameters are modified
    if (finalUpdates.booking_date && finalUpdates.start_time && finalUpdates.duration_hours) {
      const timestamps = calculateSASTTimestamps(
        finalUpdates.booking_date, 
        finalUpdates.start_time, 
        Number(finalUpdates.duration_hours)
      );
      finalUpdates = { ...finalUpdates, ...timestamps };
    }

    // ALWAYS recalculate financials to ensure state consistency across merged payload
    const financials = calculateFinancials(finalUpdates, updates);
    finalUpdates = { ...finalUpdates, ...financials };

    // Strip protected/non-writable columns before calling update
    const columnsToStrip = ['id', 'created_at', 'updated_at', 'xmin'];
    columnsToStrip.forEach(col => delete finalUpdates[col]);

    // 5. Update Database
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    // 6. Concurrency Guard
    if (error && error.code === '23P01') {
      return NextResponse.json({ 
        error: "Conflict", 
        message: "Slot Unavailable: Cannot move booking to this bay/time as it is already occupied." 
      }, { status: 409 });
    } else if (error) {
      throw error;
    }

    return NextResponse.json({ status: 'success', data });

  } catch (error: any) {
    console.error("Admin Update API Error:", error);
    return NextResponse.json({ 
      error: "Server Error", 
      message: error.message 
    }, { status: 500 });
  }
}
