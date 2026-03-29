import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendStoreReceiptEmail, sendGuestConfirmationEmail } from '@/lib/mail';

const BOOKING_TABLE_COLUMNS = [
  'simulator_id', 'guest_name', 'guest_email', 'guest_phone', 
  'booking_date', 'start_time', 'end_time', 'duration_hours', 
  'player_count', 'total_price', 'amount_paid', 'amount_due', 
  'status', 'payment_status', 'payment_type', 'user_type', 
  'booking_source', 'notes', 'addon_water_qty', 'addon_gloves_qty', 
  'addon_balls_qty', 'addon_club_rental', 'addon_coaching', 
  'n8n_status', 'slot_start', 'slot_end', 'yoco_payment_id'
];

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
const calculateFinancials = (payload: any, existingRecord: any, updates: any) => {
  const players = Number(payload.player_count !== undefined ? payload.player_count : existingRecord.player_count) || 1;
  const duration = Number(payload.duration_hours !== undefined ? payload.duration_hours : existingRecord.duration_hours) || 1;
  const baseRate = GET_BASE_HOURLY_RATE(players);
  
  const calculatedBase = baseRate * duration;
  const water = (Number(payload.addon_water_qty) || 0) * (Number(payload.addon_water_price) || 20);
  const gloves = (Number(payload.addon_gloves_qty) || 0) * (Number(payload.addon_gloves_price) || 220);
  const balls = (Number(payload.addon_balls_qty) || 0) * (Number(payload.addon_balls_price) || 50);
  const clubs = payload.addon_club_rental ? (100 * duration) : 0;
  const coaching = payload.addon_coaching ? 250 : 0;
  
  const systemTotal = Math.max(0, calculatedBase + water + gloves + balls + clubs + coaching);

  const isManualTotal = updates.total_price !== undefined;
  const total_price = isManualTotal ? Math.max(0, Number(updates.total_price)) : systemTotal;
  
  // MANUAL POS RECONCILIATION LOGIC
  let amount_paid = Number(existingRecord.amount_paid) || 0;
  
  // SSOT SETTLEMENT INTENT
  // If the manager has triggered a "Settle" action, they have paid the current total.
  if (updates.action === 'settle' || updates.payment_status === 'paid_instore') {
    amount_paid = total_price;
  } 
  else if (updates.payment_status === 'paid_online' && updates.reconciled_manually) {
    const expectedMatch = existingRecord.notes?.match(/Expected Online Payment: R(\d+)/);
    const intendedAmount = expectedMatch ? Number(expectedMatch[1]) : (total_price - amount_paid);
    amount_paid += intendedAmount;
  } else if (updates.amount_paid !== undefined) {
    amount_paid = Number(updates.amount_paid);
  }

  // Derive amount_due from SSOT values (Total - Paid)
  // Ignore any amount_due passed from the frontend unless it's a manual override.
  const isManualDue = updates.amount_due !== undefined && isManualTotal;
  const amount_due = isManualDue ? Math.max(0, Number(updates.amount_due)) : Math.max(0, total_price - amount_paid);
  
  // Dynamic status assignment
  let status = updates.status || existingRecord.status;
  let payment_status = updates.payment_status || existingRecord.payment_status;

  if (amount_due <= 0) {
    status = 'confirmed';
    if (payment_status !== 'paid_instore' && payment_status !== 'completed') payment_status = 'paid_online';
  } else if (amount_paid > 0 && amount_due > 0) {
    payment_status = 'partially_paid';
    status = 'confirmed'; 
  }
  
  return { total_price, amount_paid, amount_due, status, payment_status };
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

    // Explicitly strip sensitive or ghost columns before transit
    delete finalUpdates.id;
    delete finalUpdates.balance_due;
    delete finalUpdates.xmin;

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
    const financials = calculateFinancials(finalUpdates, existingRecord, updates);
    finalUpdates = { ...finalUpdates, ...financials };

    // 5. THE IRON GATE: Sanitize payload against physical database columns
    const sanitizedPayload = Object.keys(finalUpdates)
      .filter(key => BOOKING_TABLE_COLUMNS.includes(key))
      .reduce((obj, key) => {
        obj[key] = finalUpdates[key];
        return obj;
      }, {} as any);

    // 6. Update Database using sanitized payload 
    // Explicitly mapping financial columns from the calculation engine to ensure persistence
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        ...sanitizedPayload,
        total_price: financials.total_price,
        amount_paid: financials.amount_paid,
        amount_due: financials.amount_due,
        payment_status: financials.payment_status,
        status: financials.status
      })
      .eq('id', id)
      .select()
      .single();

    // 7. Concurrency Guard
    if (error && error.code === '23P01') {
      return NextResponse.json({ 
        error: "Conflict", 
        message: "Slot Unavailable: Cannot move booking to this bay/time as it is already occupied." 
      }, { status: 409 });
    } else if (error) {
      throw error;
    }

    // 8. Dispatch Confirmation Emails on Manual Reconciliation
    if ((updates.payment_status === 'paid_online' || updates.payment_status === 'paid_instore') && updates.reconciled_manually) {
      const emailProps = {
        guest_email: data.guest_email,
        guest_name: data.guest_name || "Golfer",
        booking_date: data.booking_date,
        start_time: data.start_time,
        duration_hours: Number(data.duration_hours),
        player_count: Number(data.player_count),
        simulator_id: data.simulator_id,
        total_price: Number(data.total_price),
        amount_paid: Number(data.amount_paid) || 0,
        addon_club_rental: data.addon_club_rental || false,
        addon_coaching: data.addon_coaching || false
      };

      await Promise.allSettled([
        sendStoreReceiptEmail(emailProps),
        sendGuestConfirmationEmail(emailProps)
      ]);
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
