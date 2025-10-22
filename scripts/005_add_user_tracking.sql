-- Add User Tracking for First-Time Booking Detection
-- This migration adds fields to track first-time users and referral codes

-- Add column to track if this is user's first booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_first_booking BOOLEAN DEFAULT true;

-- Add column to store referral code for first-time users
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Add column to track which referral code was used (if any)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS used_referral_code TEXT;

-- Create index for first-time user queries (optimize lookups by email)
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email
ON bookings(guest_email)
WHERE guest_email IS NOT NULL;

-- Create index for checking booking history efficiently
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_bookings_referral_code
ON bookings(referral_code)
WHERE referral_code IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN bookings.is_first_booking IS 'Indicates if this was the user''s first booking (based on email)';
COMMENT ON COLUMN bookings.referral_code IS 'Unique referral code generated for this user to share with friends';
COMMENT ON COLUMN bookings.used_referral_code IS 'Referral code used by this user when booking (if applicable)';

-- Verify alterations
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('is_first_booking', 'referral_code', 'used_referral_code')
ORDER BY column_name;

-- Verify indexes created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'bookings'
  AND indexname LIKE 'idx_bookings_%'
ORDER BY indexname;
