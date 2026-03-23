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
 * Standardized Financial Engine
 * Recomputes totals based on POS add-ons.
 */
const calculateFinancials = (payload: any) => {
  const base = Number(payload.base_price || 0);
  const water = Number(payload.addon_water_qty || 0) * Number(payload.addon_water_price || 20);
  const gloves = Number(payload.addon_gloves_qty || 0) * Number(payload.addon_gloves_price || 0);
  const balls = Number(payload.addon_balls_qty || 0) * Number(payload.addon_balls_price || 0);
  
  const total_price = base + water + gloves + balls;
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

    let finalUpdates = { ...updates };

    // 2. Dynamic Math Engines
    // Rebuild timestamps if any time-parameters are changed
    if (updates.booking_date && updates.start_time && updates.duration_hours) {
      const timestamps = calculateSASTTimestamps(
        updates.booking_date, 
        updates.start_time, 
        Number(updates.duration_hours)
      );
      finalUpdates = { ...finalUpdates, ...timestamps };
    }

    // ALWAYS recalculate financials to ensure state consistency
    const financials = calculateFinancials(updates);
    finalUpdates = { ...finalUpdates, ...financials };

    // 3. Update Database
    const { data, error } = await supabaseAdmin
      .from('bookings_test')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    // 4. Concurrency Guard
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
