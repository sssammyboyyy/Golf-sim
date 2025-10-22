-- Seed Availability Slots
-- This script generates initial availability slots for the next 30 days
-- Creates 8 time slots per day (2-hour windows from 06:00 to 22:00)

-- Time slots per day:
-- 06:00-08:00, 08:00-10:00, 10:00-12:00, 12:00-14:00
-- 14:00-16:00, 16:00-18:00, 18:00-20:00, 20:00-22:00

-- Configuration:
-- max_bookings = 1 (single simulator)
-- current_bookings = 0 (no bookings yet)
-- is_available = true (all slots open)
-- day_type determined by day of week (0,6 = weekend, else weekday)

-- This script uses a DO block to generate dates dynamically
DO $$
DECLARE
  current_date DATE;
  end_date DATE;
  day_of_week INT;
  day_type_val TEXT;
  time_slots TEXT[] := ARRAY['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
  start_time TEXT;
  end_time TEXT;
  i INT;
BEGIN
  -- Start from today
  current_date := CURRENT_DATE;

  -- End 30 days from now
  end_date := CURRENT_DATE + INTERVAL '30 days';

  -- Loop through each date
  WHILE current_date <= end_date LOOP
    -- Get day of week (0 = Sunday, 6 = Saturday)
    day_of_week := EXTRACT(DOW FROM current_date);

    -- Determine day type
    IF day_of_week IN (0, 6) THEN
      day_type_val := 'weekend';
    ELSE
      day_type_val := 'weekday';
    END IF;

    -- Check if this date is a holiday (will be overridden if holiday exists)
    -- Holidays should be manually added to holidays table and then day_type updated

    -- Loop through each time slot
    FOR i IN 1..8 LOOP
      start_time := time_slots[i];

      -- Calculate end time (2 hours after start)
      IF i < 8 THEN
        end_time := time_slots[i + 1];
      ELSE
        end_time := '22:00';
      END IF;

      -- Insert availability slot
      INSERT INTO availability (
        date,
        start_time,
        end_time,
        is_available,
        max_bookings,
        current_bookings,
        day_type
      ) VALUES (
        current_date,
        start_time::TIME,
        end_time::TIME,
        true,
        1,
        0,
        day_type_val::day_type
      )
      ON CONFLICT (date, start_time) DO NOTHING;
    END LOOP;

    -- Move to next date
    current_date := current_date + INTERVAL '1 day';
  END LOOP;

  RAISE NOTICE 'Availability slots generated for % days', end_date - CURRENT_DATE;
END $$;

-- Verify data inserted
SELECT
  COUNT(*) as total_slots,
  COUNT(DISTINCT date) as unique_dates,
  MIN(date) as first_date,
  MAX(date) as last_date
FROM availability;

-- Expected results:
-- total_slots: 248 (31 days × 8 slots)
-- unique_dates: 31 (today + 30 days)

-- View sample of availability by day type
SELECT
  day_type,
  COUNT(*) as slot_count,
  COUNT(DISTINCT date) as day_count
FROM availability
GROUP BY day_type
ORDER BY day_type;

-- View first day's slots
SELECT
  date,
  start_time,
  end_time,
  day_type,
  is_available,
  max_bookings,
  current_bookings
FROM availability
WHERE date = CURRENT_DATE
ORDER BY start_time;
