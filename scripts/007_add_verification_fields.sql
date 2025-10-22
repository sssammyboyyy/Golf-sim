-- Add User Type Verification Fields
-- This migration adds fields to track student/age verification for discounted user types

-- Add columns to track user type verification
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS student_verified BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN bookings.student_verified IS 'Indicates if student checkbox was checked during booking (ID verification required at check-in)';
COMMENT ON COLUMN bookings.age_verified IS 'Indicates if age gate was confirmed for junior/senior bookings';
COMMENT ON COLUMN bookings.verification_notes IS 'Additional notes about verification requirements for this booking';

-- Create index for filtering bookings requiring verification at check-in
CREATE INDEX IF NOT EXISTS idx_bookings_student_verified
ON bookings(student_verified, booking_date)
WHERE student_verified = true AND status IN ('confirmed', 'completed');

-- Create index for age-verified bookings
CREATE INDEX IF NOT EXISTS idx_bookings_age_verified
ON bookings(age_verified, user_type)
WHERE age_verified = true;

-- Verify alterations
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('student_verified', 'age_verified', 'verification_notes')
ORDER BY column_name;

-- View summary of verification status
SELECT
  user_type,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN student_verified = true THEN 1 END) as student_verified_count,
  COUNT(CASE WHEN age_verified = true THEN 1 END) as age_verified_count
FROM bookings
GROUP BY user_type
ORDER BY user_type;

-- Verify indexes created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'bookings'
  AND indexname LIKE 'idx_bookings_%verified%'
ORDER BY indexname;
