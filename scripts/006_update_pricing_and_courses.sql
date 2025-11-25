-- Update famous course pricing and add St. Andrews course

-- Update upsells table to include golf club rental option
INSERT INTO public.upsells (name, description, price, category, trigger_condition, is_active) 
VALUES ('Golf Club Rental', 'Full set of premium golf clubs for your session', 100.00, 'equipment', '{"player_count_min": 1}', true)
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description, 
    price = EXCLUDED.price,
    is_active = EXCLUDED.is_active;

-- Add St. Andrews to famous courses (if you have a courses table)
-- Note: The software has 5000+ courses, but we're ensuring St. Andrews is explicitly available
-- This is a placeholder - adjust based on your actual courses table structure
-- CREATE TABLE IF NOT EXISTS public.famous_courses (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL UNIQUE,
--   location VARCHAR(255),
--   holes INTEGER DEFAULT 18,
--   par INTEGER,
--   is_active BOOLEAN DEFAULT true,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- INSERT INTO public.famous_courses (name, location, holes, par, is_active)
-- VALUES ('St. Andrews (Old Course)', 'St. Andrews, Scotland', 18, 72, true)
-- ON CONFLICT (name) DO NOTHING;

-- Add comment about pricing update
COMMENT ON TABLE public.bookings IS 'Bookings table - Updated pricing: 4-ball and 3-ball specials now R150/person/hour with 3-hour minimum';
