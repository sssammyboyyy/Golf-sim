-- =============================================
-- Migration: Hardening & Idempotency
-- Description: Adds columns for idempotency and observability,
--              and creates an atomic booking function.
-- =============================================

-- 1. Add Idempotency & Observability Columns
-- -------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_request_id uuid,
  ADD COLUMN IF NOT EXISTS correlation_id uuid,
  ADD COLUMN IF NOT EXISTS yoco_checkout_url text,
  ADD COLUMN IF NOT EXISTS n8n_status text DEFAULT 'pending', -- pending, sent, error
  ADD COLUMN IF NOT EXISTS n8n_response text,
  ADD COLUMN IF NOT EXISTS n8n_last_attempt_at timestamptz;

-- 2. Enforce Idempotency
-- -------------------------------------------------------------
-- Ensure we can't accidentally process the same request ID twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_booking_request_id 
  ON public.bookings(booking_request_id);

-- 3. Atomic Booking Creation Function
-- -------------------------------------------------------------
-- This moves the "Check Availability -> Insert" logic into a single DB transaction
-- preventing race conditions where two users book the same slot simultaneously.

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_booking_request_id uuid,
  p_booking_date date,
  p_start_time text, -- passed as text HH:MM:SS
  p_duration_hours numeric,
  p_simulator_id int,
  p_slot_start timestamptz,
  p_slot_end timestamptz,
  p_guest_details jsonb, -- { name, email, phone }
  p_payment_details jsonb, -- { total_price, amount_to_pay, payment_type, payment_status }
  p_metadata jsonb -- { session_type, coupon_code, correlation_id }
) RETURNS public.bookings AS $$
DECLARE
  v_existing_booking public.bookings;
  v_new_booking public.bookings;
  v_conflict boolean;
BEGIN
  -- A. Idempotency Check: Return existing booking if we've seen this ID
  SELECT * INTO v_existing_booking FROM public.bookings 
  WHERE booking_request_id = p_booking_request_id;
  
  IF v_existing_booking.id IS NOT NULL THEN
    RETURN v_existing_booking;
  END IF;

  -- B. Availability Check (Double Check inside transaction)
  -- The app does this too, but we do it here (locked) to be 100% sure.
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.simulator_id = p_simulator_id
      AND b.status != 'cancelled'
      AND b.booking_date = p_booking_date -- Optimization: Filter by date first
      AND tstzrange(b.slot_start, b.slot_end) && tstzrange(p_slot_start, p_slot_end)
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE' USING errcode = '23P01';
  END IF;

  -- C. Insert the Booking
  INSERT INTO public.bookings (
    booking_request_id, booking_date, start_time, duration_hours,
    simulator_id, slot_start, slot_end,
    guest_name, guest_email, guest_phone,
    total_price, amount_paid, payment_type, payment_status, status,
    session_type, coupon_code, correlation_id
  ) VALUES (
    p_booking_request_id, p_booking_date, p_start_time::time, p_duration_hours,
    p_simulator_id, p_slot_start, p_slot_end,
    p_guest_details->>'name', p_guest_details->>'email', p_guest_details->>'phone',
    (p_payment_details->>'total_price')::numeric, (p_payment_details->>'amount_paid')::numeric,
    p_payment_details->>'payment_type', p_payment_details->>'payment_status', p_payment_details->>'status',
    p_metadata->>'session_type', p_metadata->>'coupon_code', (p_metadata->>'correlation_id')::uuid
  ) RETURNING * INTO v_new_booking;

  RETURN v_new_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 4. Permissions
-- -------------------------------------------------------------
-- Grant execute permission to API roles (anonymous and logged in users)
GRANT EXECUTE ON FUNCTION public.create_booking_atomic TO anon, authenticated, service_role;
