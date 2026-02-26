-- Consolidated Schema Documentation (V2 - The Mulligan)
-- DO NOT RUN THIS AS A MIGRATION
-- This script serves as the single source of truth for the current live database structure, 
-- replacing the outdated information in 001_create_tables.sql

CREATE TABLE public.simulators (
    id integer NOT NULL PRIMARY KEY,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.coupons (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE,
    discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])),
    discount_value numeric NOT NULL,
    discount_percent numeric,
    max_uses integer,
    current_uses integer DEFAULT 0,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.bookings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_request_id text UNIQUE,
    user_id uuid,
    
    booking_date date,
    start_time text,
    end_time text,
    slot_start timestamp with time zone,
    slot_end timestamp with time zone,
    duration_hours numeric,
    
    player_count integer,
    session_type text,
    simulator_id integer REFERENCES public.simulators(id),
    famous_course_option text,
    user_type text,
    booking_source text,
    
    base_price numeric DEFAULT 0,
    total_price numeric DEFAULT 0,
    amount_paid numeric DEFAULT 0,
    amount_due numeric DEFAULT 0,
    deposit_amount numeric DEFAULT 0,
    payment_type text,
    status text NOT NULL DEFAULT 'confirmed'::text,
    payment_status text NOT NULL DEFAULT 'pending'::text,
    
    payment_reference text,
    yoco_payment_id text,
    coupon_code text REFERENCES public.coupons(code),
    
    guest_name text,
    guest_email text,
    guest_phone text,
    special_requests text,
    
    addon_water_qty integer DEFAULT 0,
    addon_water_price numeric DEFAULT 0,
    addon_gloves_qty integer DEFAULT 0,
    addon_gloves_price numeric DEFAULT 0,
    addon_balls_qty integer DEFAULT 0,
    addon_balls_price numeric DEFAULT 0,
    addon_coaching boolean DEFAULT false,
    addon_club_rental boolean DEFAULT false,
    
    accept_whatsapp boolean DEFAULT false,
    enter_competition boolean DEFAULT false,
    
    n8n_status text,
    n8n_response text,
    n8n_last_attempt_at timestamp with time zone,
    
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    confirmed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    reminder_1h_sent boolean DEFAULT false,
    reminder_24h_sent boolean DEFAULT false,
    
    -- Excludes overlapping bookings for the same simulator
    EXCLUDE USING gist (simulator_id WITH =, tstzrange(slot_start, slot_end, '[)'::text) WITH &&)
);

CREATE TABLE public.reports (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    total_revenue numeric DEFAULT 0,
    total_bookings integer DEFAULT 0,
    occupancy_rate numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);
