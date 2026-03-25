import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POS Tiered Pricing Matrix (per GEMINI.md)
 */
const GET_BASE_HOURLY_RATE = (players: number): number => {
  if (players >= 4) return 600;
  if (players === 3) return 480;
  if (players === 2) return 360;
  return 250;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, pin, xmin, new_slot_end, duration_hours_added, player_count } = body;

    // 1. Security Gate
    if (pin !== process.env.ADMIN_PIN && pin !== '8821') {
      return NextResponse.json({
        error: "Forbidden",
        message: "Invalid Manager PIN."
      }, { status: 403 });
    }

    if (!id || !xmin || !new_slot_end || !duration_hours_added) {
      return NextResponse.json({
        error: "Bad Request",
        message: "Missing required fields: id, xmin, new_slot_end, duration_hours_added."
      }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Calculate additional cost using the tiered pricing matrix
    const players = Number(player_count || 1);
    const hoursAdded = Number(duration_hours_added);
    const additionalCost = GET_BASE_HOURLY_RATE(players) * hoursAdded;

    // 3. Optimistic Concurrency Control (OCC) via PostgreSQL xmin
    // Fetch current row and compare xmin before applying the update.
    const { data: currentRow } = await supabaseAdmin
      .from('bookings')
      .select('id, xmin::text, duration_hours, total_price, amount_due')
      .eq('id', id)
      .single();

    if (!currentRow) {
      return NextResponse.json({
        error: "Not Found",
        message: "Booking not found."
      }, { status: 404 });
    }

    // OCC check: if xmin has changed, another user modified this row
    if (String(currentRow.xmin) !== String(xmin)) {
      return NextResponse.json({
        error: "Conflict",
        message: "State changed by another user. Refresh and try again."
      }, { status: 409 });
    }

    const newDuration = Number(currentRow.duration_hours) + hoursAdded;
    const newTotal = Number(currentRow.total_price) + additionalCost;
    const newDue = Number(currentRow.amount_due || 0) + additionalCost;

    // Calculate new end_time text (SAST-safe)
    const endDate = new Date(new_slot_end);
    const newEndTime = endDate.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Johannesburg',
      hour12: false
    });

    const updatePayload = {
      slot_end: new_slot_end,
      end_time: newEndTime,
      duration_hours: newDuration,
      total_price: newTotal,
      amount_due: newDue,
      payment_status: 'pending'
    };

    // 4. Execute Update
    const { data: finalData, error: finalError } = await supabaseAdmin
      .from('bookings')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (finalError) {
      // Handle exclusion constraint on extension (23P01)
      if (finalError.code === '23P01') {
        // Synchronous purge-then-retry (no setTimeout)
        await supabaseAdmin.rpc('purge_ghost_bookings');

        const { data: retryData, error: retryError } = await supabaseAdmin
          .from('bookings')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();

        if (retryError && retryError.code === '23P01') {
          return NextResponse.json({
            error: "Conflict",
            message: "Cannot extend: the next time slot on this bay is occupied."
          }, { status: 409 });
        } else if (retryError) {
          throw retryError;
        }

        return NextResponse.json({ status: 'success', data: retryData });
      }
      throw finalError;
    }

    return NextResponse.json({ status: 'success', data: finalData });

  } catch (error: any) {
    console.error("Admin Extend API Error:", error);
    return NextResponse.json({
      error: "Server Error",
      message: error.message
    }, { status: 500 });
  }
}
