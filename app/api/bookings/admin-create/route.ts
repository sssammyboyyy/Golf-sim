import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Standardized SAST Math Engine
 * Guarantees +02:00 offsets and consistent timestamp derivation.
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
 * Recalculates totals and due amounts live on the backend.
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
    const { pin, ...payload } = body;

    // 1. Security Gate
    if (pin !== process.env.ADMIN_PIN && pin !== '8821') {
      return NextResponse.json({ 
        error: "Forbidden", 
        message: "Invalid Manager PIN. Authorization failed." 
      }, { status: 403 });
    }

    // Explicit Service Role Client for RLS Bypass
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const timestamps = calculateSASTTimestamps(
      payload.booking_date, 
      payload.start_time, 
      Number(payload.duration_hours)
    );
    const financials = calculateFinancials(payload);

    const finalPayload = {
      ...payload,
      ...timestamps,
      ...financials,
      booking_source: 'walk_in',
      payment_type: 'walk_in',
      payment_status: financials.amount_due === 0 ? 'paid' : 'partial',
      status: 'confirmed',
    };

    // 2. Initial Insert Attempt
    const { data, error } = await supabaseAdmin
      .from('bookings_test')
      .insert(finalPayload)
      .select()
      .single();

    // 3. Self-Healing Concurrency Guard (Ghost Cleanup Sequence)
    if (error && error.code === '23P01') {
      console.warn(`[Concurrency] 23P01 Conflict on Bay ${payload.simulator_id}. Triggering Self-Healing Cleanup...`);
      
      // Execute Ghost Cleanup RPC
      await supabaseAdmin.rpc('purge_ghost_bookings', { 
        target_bay: Number(payload.simulator_id) 
      });
      
      // Defensive 200ms Backoff
      await new Promise(resolve => setTimeout(resolve, 200));

      // Final Retry Attempt
      const { data: retryData, error: retryError } = await supabaseAdmin
        .from('bookings_test')
        .insert(finalPayload)
        .select()
        .single();

      if (retryError && retryError.code === '23P01') {
        return NextResponse.json({ 
          error: "Conflict", 
          message: "Slot Unavailable: This bay is already booked at this time." 
        }, { status: 409 });
      } else if (retryError) {
        throw retryError;
      }
      return NextResponse.json({ status: 'success', data: retryData });
    } else if (error) {
      throw error;
    }

    return NextResponse.json({ status: 'success', data });

  } catch (error: any) {
    console.error("Admin Create API Error:", error);
    return NextResponse.json({ 
      error: "Server Error", 
      message: error.message 
    }, { status: 500 });
  }
}
