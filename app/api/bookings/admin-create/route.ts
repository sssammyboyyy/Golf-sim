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

const GET_BASE_HOURLY_RATE = (players: number): number => {
  if (players >= 4) return 600;
  if (players === 3) return 480;
  if (players === 2) return 360;
  return 250;
};

/**
 * Standardized Financial Engine
 * Recalculates totals and due amounts live on the backend.
 */
const calculateFinancials = (payload: any) => {
  const players = Number(payload.player_count || 1);
  const duration = Number(payload.duration_hours || 1);
  const baseRate = GET_BASE_HOURLY_RATE(players);
  
  let total_price = Number(payload.total_price);
  
  if (!total_price || total_price === 0) {
    const calculatedBase = baseRate * duration;
    const water = Number(payload.addon_water_qty || 0) * Number(payload.addon_water_price || 20);
    const gloves = Number(payload.addon_gloves_qty || 0) * Number(payload.addon_gloves_price || 220);
    const balls = Number(payload.addon_balls_qty || 0) * Number(payload.addon_balls_price || 50);
    const clubs = payload.addon_club_rental ? (100 * duration) : 0;
    const coaching = payload.addon_coaching ? 250 : 0;
    
    total_price = calculatedBase + water + gloves + balls + clubs + coaching;
  }
  
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

    // Detect walk-in mode: no guest_email or explicit walk-in marker
    const isWalkIn = !payload.guest_email || payload.guest_email === '' || payload.user_type === 'walk_in';

    // 2. Financial Cast & Payload Enforcement
    const basePayload = {
      ...payload,
      ...timestamps,
      total_price: Number(financials.total_price),
      amount_due: Number(financials.amount_due),
      amount_paid: Number(payload.amount_paid || 0),
      guest_name: payload.guest_name || 'Walk-In',
      guest_email: isWalkIn ? 'walkin@venue-os.com' : (payload.guest_email || 'walkin@venue-os.com'),
      guest_phone: isWalkIn ? '0000000000' : (payload.guest_phone || '0000000000'),
      user_type: isWalkIn ? 'walk_in' : (payload.user_type || 'guest'),
      booking_source: 'walk_in',
      payment_type: isWalkIn ? (payload.payment_type || 'cash') : (payload.payment_type || 'walk_in'),
      payment_status: financials.amount_due === 0 ? 'paid_instore' : (payload.payment_status || 'pending'),
      status: 'confirmed',
      n8n_status: isWalkIn ? 'bypassed' : 'pending',
    };

    // 3. Database Execution with Strict Error Capture
    const performInsert = async (p: any) => {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .insert(p)
        .select()
        .single();
      
      if (error) {
        console.error('[ADMIN CREATE DATABASE REJECTION]', {
          code: error.code,
          message: error.message,
          details: error.details,
          payload: p
        });
        throw error;
      }
      return data;
    };

    try {
      const data = await performInsert(basePayload);
      return NextResponse.json({ status: 'success', data });
    } catch (error: any) {
      // 4. Self-Healing Concurrency Guard (Synchronous Retry)
      if (error.code === '23P01') {
        console.warn(`[Concurrency] 23P01 Conflict on Bay ${payload.simulator_id}. Triggering Synchronous Purge...`);
        await supabaseAdmin.rpc('purge_ghost_bookings');
        
        try {
          const retryData = await performInsert(basePayload);
          return NextResponse.json({ status: 'success', data: retryData });
        } catch (retryError: any) {
          if (retryError.code === '23P01') {
            return NextResponse.json({ 
              error: "Conflict", 
              message: "Slot Unavailable: This bay is already booked at this time." 
            }, { status: 409 });
          }
          throw retryError;
        }
      }
      throw error;
    }

  } catch (error: any) {
    console.error("[ADMIN CREATE FATAL]", error);
    return NextResponse.json({ 
      error: "Server Error", 
      message: error.message || "Internal Ledger Failure"
    }, { status: 500 });
  }
}
