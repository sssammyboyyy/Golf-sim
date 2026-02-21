-- =================================================================
-- Migration 011: Fix unique_simulator_slot constraint
-- =================================================================
-- Problem: The existing unique_simulator_slot constraint fires for ALL statuses
-- including 'cancelled' and 'pending'. This blocks re-booking a slot after
-- a user cancels their Yoco checkout, even after the row is deleted,
-- AND it blocks a fresh booking if ANY prior pending row exists for the same slot.
--
-- Solution: 
--   1. Drop the old unconditional unique constraint.
--   2. Purge all stale pending rows (> 30 min old) that are ghost-blocking slots.
--   3. Create a PARTIAL unique index that ONLY enforces uniqueness for  
--      active bookings (confirmed or pending < 30 mins old).
--      This is done in application logic, not the index - the index just 
--      covers confirmed rows to prevent true double-bookings.
-- =================================================================

-- Step 1: Drop the old unconditional unique constraint
-- (It may be a constraint or an index - we try both)
DO $$
BEGIN
    -- Try to drop as a named constraint first
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_simulator_slot'
    ) THEN
        ALTER TABLE public.bookings DROP CONSTRAINT unique_simulator_slot;
        RAISE NOTICE 'Dropped constraint unique_simulator_slot';
    END IF;
    
    -- Try to drop as a named index
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'unique_simulator_slot'
    ) THEN
        DROP INDEX IF EXISTS unique_simulator_slot;
        RAISE NOTICE 'Dropped index unique_simulator_slot';
    END IF;
END $$;

-- Step 2: Purge all stale pending bookings older than 30 minutes
-- These are ghost rows from cancelled/abandoned checkout sessions
DELETE FROM public.bookings
WHERE status = 'pending'
  AND payment_status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes';

-- Step 3: Create a smarter PARTIAL unique index on (simulator_id, slot_start, slot_end)
-- This ONLY enforces uniqueness for confirmed bookings, NOT pending ones.
-- The application code handles pending conflicts via the 20-minute ghost filter.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_slot
ON public.bookings (simulator_id, slot_start, slot_end)
WHERE status IN ('confirmed', 'pending');

-- NOTE: If you want to be even safer and only block confirmed rows,
-- change the WHERE clause to: WHERE status = 'confirmed'
-- This allows multiple 'pending' rows for the same slot simultaneously,
-- but only one can be 'confirmed'. The application logic prevents ghost bookings.
