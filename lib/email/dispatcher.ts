import { createClient } from '@supabase/supabase-js';
import { sendGuestConfirmationEmail, sendStoreReceiptEmail } from '@/lib/mail';

export async function dispatchBookingConfirmations(bookingId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Dispatcher] Missing Supabase keys for dispatcher');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the full booking state, bypassing RLS
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error(`[Dispatcher] Could not fetch booking ${bookingId}`, fetchError);
      return;
    }

    // Idempotency Lock
    if (booking.email_sent === true) {
      console.log(`[Dispatcher] Email already sent for booking ${bookingId}. Skipping.`);
      return;
    }

    try {
      // Dispatch both emails concurrently
      await Promise.all([
        sendGuestConfirmationEmail(booking),
        sendStoreReceiptEmail(booking)
      ]);

      // Stamp the database successfully
      await supabase
        .from('bookings')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', bookingId);
        
      console.log(`[Dispatcher] Successfully dispatched confirmations for ${bookingId}`);
      
    } catch (emailError: any) {
      console.error(`[Dispatcher] Error sending emails for ${bookingId}`, emailError);
      // Fallback: log the error into the database
      await supabase
        .from('bookings')
        .update({
          n8n_last_error: emailError.message || 'Unknown email error'
        })
        .eq('id', bookingId);
    }

  } catch (err) {
    console.error('[Dispatcher] Fatal dispatcher error', err);
  }
}
