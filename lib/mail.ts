import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const getBayName = (id: number) => {
  if (id === 1) return 'Lounge Bay';
  if (id === 2) return 'Middle Bay';
  if (id === 3) return 'Window Bay';
  return `Bay ${id}`;
};

export async function sendGuestConfirmationEmail(booking: any) {
  try {
    if (!booking.guest_email || booking.guest_email === 'walkin@venue-os.com') return;

    const bayName = getBayName(booking.simulator_id);
    
    let addonsHtml = '';
    if (booking.addon_coaching) addonsHtml += `<tr><td style="padding:8px 0;font-size:14px;color:#92400e;">Coaching Session</td><td style="padding:8px 0;font-size:14px;color:#92400e;text-align:right;font-weight:600;">Included</td></tr>`;
    if (booking.addon_club_rental) addonsHtml += `<tr><td style="padding:8px 0;font-size:14px;color:#92400e;">Club Rentals</td><td style="padding:8px 0;font-size:14px;color:#92400e;text-align:right;font-weight:600;">Included</td></tr>`;
    if (booking.addon_water_qty > 0) addonsHtml += `<tr><td style="padding:8px 0;font-size:14px;color:#92400e;">Water (x${booking.addon_water_qty})</td><td style="padding:8px 0;font-size:14px;color:#92400e;text-align:right;font-weight:600;">Included</td></tr>`;
    if (booking.addon_gloves_qty > 0) addonsHtml += `<tr><td style="padding:8px 0;font-size:14px;color:#92400e;">Gloves (x${booking.addon_gloves_qty})</td><td style="padding:8px 0;font-size:14px;color:#92400e;text-align:right;font-weight:600;">Included</td></tr>`;
    if (booking.addon_balls_qty > 0) addonsHtml += `<tr><td style="padding:8px 0;font-size:14px;color:#92400e;">Balls (x${booking.addon_balls_qty})</td><td style="padding:8px 0;font-size:14px;color:#92400e;text-align:right;font-weight:600;">Included</td></tr>`;

    const addonsSection = addonsHtml ? `
      <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:24px;margin-bottom:32px;">
        <span style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;margin-bottom:15px;display:block;">✨ Selected Add-ons</span>
        <table style="width:100%;border-collapse:collapse;">
          ${addonsHtml}
        </table>
      </div>` : '';

    const html = `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.5;">
        <div style="background-color:#1a472a;background-image:linear-gradient(135deg,#1a472a 0%,#0d2a19 100%);padding:60px 40px;text-align:center;border-radius:12px 12px 0 0;">
          <div style="display:inline-block;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 16px;border-radius:100px;font-size:12px;font-weight:600;margin-bottom:20px;">SESSION CONFIRMED</div>
          <p style="color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;margin:0 0 8px;">The Mulligan</p>
          <p style="color:#fbbf24;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:0 0 30px;opacity:0.9;">The Simulator Never Judges</p>
          <h1 style="color:#fff;font-size:32px;font-weight:700;margin:0;line-height:1.2;">You're Teeing Off!</h1>
          <p style="color:#a3d9a5;font-size:16px;margin:12px 0 0;opacity:0.8;">See you on the green, ${booking.guest_name || 'Golfer'}.</p>
        </div>
        <div style="padding:40px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background-color:#ffffff;">
          <p style="font-size:18px;color:#111827;font-weight:600;margin:0 0 16px;">Exciting news, ${booking.guest_name || 'Golfer'}!</p>
          <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 32px;">Your booking at The Mulligan is confirmed. We've reserved ${bayName} exclusively for your group.</p>
          <div style="background-color:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:24px;margin-bottom:32px;">
            <span style="font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;display:block;">BOOKING DETAILS</span>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Date</td><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${booking.booking_date}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Start Time</td><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${booking.start_time}</td></tr>
              <tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#6b7280;">Duration</td><td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;font-weight:600;text-align:right;">${booking.duration_hours} Hours</td></tr>
              <tr><td style="padding:12px 0;font-size:14px;color:#6b7280;">Players</td><td style="padding:12px 0;font-size:14px;color:#111827;font-weight:600;text-align:right;">${booking.player_count} Players</td></tr>
            </table>
          </div>
          ${addonsSection}
          <div style="background-color:#ecfdf5;border:1px solid #d1fae5;border-radius:12px;padding:24px;margin-bottom:32px;text-align:center;">
            <span style="font-size:13px;color:#065f46;opacity:0.7;margin-bottom:12px;display:block;font-weight:500;">PAYMENT CONFIRMED</span>
            <p style="font-size:28px;font-weight:700;color:#065f46;margin:0;">R ${Number(booking.amount_paid || 0).toFixed(2)}</p>
            <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(6,95,70,0.1);">
              <span style="font-size:14px;color:#065f46;font-weight:500;">Balance Due at Venue: </span>
              <span style="font-size:18px;font-weight:700;color:#92400e;">R ${Number(booking.amount_due || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: 'The Mulligan <bookings@venue-os.com>',
      to: booking.guest_email,
      subject: `Confirmed: Your Tee Time at The Mulligan ⛳`,
      html: html,
    });
    console.log(`✅ Guest receipt sent to ${booking.guest_email}`);
  } catch (error) {
    console.error('❌ Failed to send guest receipt:', error);
  }
}

export async function sendStoreReceiptEmail(booking: any) {
  try {
    const bayName = getBayName(booking.simulator_id);
    
    let addonsHtml = '';
    if (booking.addon_coaching) addonsHtml += `<tr><td style="padding:10px 0;border-bottom:1px solid #27272a;color:#a1a1aa;">Coaching Session</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #27272a;font-weight:800;">INCLUDED</td></tr>`;
    if (booking.addon_club_rental) addonsHtml += `<tr><td style="padding:10px 0;border-bottom:1px solid #27272a;color:#a1a1aa;">Club Rentals</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #27272a;font-weight:800;">INCLUDED</td></tr>`;
    if (booking.addon_water_qty > 0) addonsHtml += `<tr><td style="padding:10px 0;border-bottom:1px solid #27272a;color:#a1a1aa;">Water</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #27272a;font-weight:800;">x${booking.addon_water_qty}</td></tr>`;
    if (booking.addon_gloves_qty > 0) addonsHtml += `<tr><td style="padding:10px 0;border-bottom:1px solid #27272a;color:#a1a1aa;">Gloves</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #27272a;font-weight:800;">x${booking.addon_gloves_qty}</td></tr>`;
    if (booking.addon_balls_qty > 0) addonsHtml += `<tr><td style="padding:10px 0;border-bottom:1px solid #27272a;color:#a1a1aa;">Balls</td><td style="padding:10px 0;text-align:right;border-bottom:1px solid #27272a;font-weight:800;">x${booking.addon_balls_qty}</td></tr>`;

    const addonsSection = addonsHtml ? `
      <div style="margin-bottom:32px;">
        <h2 style="font-size:11px;font-weight:900;color:#a1a1aa;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;border-bottom:1px solid #27272a;padding-bottom:8px;">SERVICES & INVENTORY</h2>
        <table style="width:100%;border-collapse:collapse;color:#ffffff;font-size:14px;">
          ${addonsHtml}
        </table>
      </div>` : '';

    const html = `
      <div style="background-color:#0a0a0a;padding:40px 20px;font-family:'Helvetica Neue',Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background-color:#121212;border:1px solid #27272a;border-radius:16px;overflow:hidden;padding:40px;">
          <div style="text-align:center;margin-bottom:30px;">
            <div style="font-size:10px;font-weight:900;color:#a1a1aa;text-transform:uppercase;letter-spacing:4px;margin-bottom:16px;">ADMIN ALERT // THE MULLIGAN</div>
            <h1 style="font-size:28px;font-weight:900;color:#ffffff;margin:0;text-transform:uppercase;">BOOKING RECEIVED</h1>
            <div style="margin-top:16px;font-size:18px;font-weight:900;color:#fbbf24;text-transform:uppercase;">${bayName}</div>
          </div>
          <div style="margin-bottom:32px;">
            <h2 style="font-size:11px;font-weight:900;color:#a1a1aa;text-transform:uppercase;letter-spacing:2px;border-bottom:1px solid #27272a;padding-bottom:8px;">GUEST INFO</h2>
            <table style="width:100%;color:#ffffff;font-size:14px;">
              <tr><td style="padding:8px 0;color:#a1a1aa;">Name</td><td style="padding:8px 0;text-align:right;font-weight:800;">${booking.guest_name || 'Walk-In'}</td></tr>
              <tr><td style="padding:8px 0;color:#a1a1aa;">Date</td><td style="padding:8px 0;text-align:right;font-weight:800;">${booking.booking_date}</td></tr>
              <tr><td style="padding:8px 0;color:#a1a1aa;">Time</td><td style="padding:8px 0;text-align:right;font-weight:800;">${booking.start_time} (${booking.duration_hours}H)</td></tr>
            </table>
          </div>
          ${addonsSection}
          <div style="background-color:#0a0a0a;border:1px solid #27272a;border-radius:12px;padding:24px;">
            <table style="width:100%;font-size:14px;">
              <tr><td style="color:#a1a1aa;">Total Value</td><td style="text-align:right;color:#ffffff;font-weight:800;">R ${Number(booking.total_price || 0).toFixed(2)}</td></tr>
              <tr><td style="color:#a1a1aa;">Amount Paid</td><td style="text-align:right;color:#ffffff;font-weight:800;">R ${Number(booking.amount_paid || 0).toFixed(2)}</td></tr>
              <tr style="font-size:18px;font-weight:900;"><td style="color:#ffffff;padding-top:12px;">OUTSTANDING</td><td style="text-align:right;color:#ef4444;padding-top:12px;">R ${Number(booking.amount_due || 0).toFixed(2)}</td></tr>
            </table>
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: 'The Mulligan Admin <admin@venue-os.com>',
      to: 'mulligan.store@gmail.com',
      subject: `🚨 New Booking: ${bayName} @ ${booking.start_time}`,
      html: html,
    });
    console.log(`✅ Admin alert sent for booking ${booking.id}`);
  } catch (error) {
    console.error('❌ Failed to send admin alert:', error);
  }
}
