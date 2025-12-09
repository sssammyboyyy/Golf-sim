-- Run this in your Supabase SQL Editor to support the n8n reminder workflow

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE;

-- Optional: Create an index for performance since n8n queries these often
CREATE INDEX IF NOT EXISTS idx_bookings_reminders 
ON bookings (status, reminder_1h_sent, reminder_24h_sent, slot_start);
