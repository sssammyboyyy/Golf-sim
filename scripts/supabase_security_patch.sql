-- supabase_security_patch.sql
-- Purpose: Resolve 401 Unauthorized errors on the booking_dashboard view.

-- Grant select permissions to anonymous and authenticated users
GRANT SELECT ON TABLE public.booking_dashboard TO anon;
GRANT SELECT ON TABLE public.booking_dashboard TO authenticated;

-- Ensure the bookings table itself is accessible via RLS or direct grants if needed
-- (Though the view usually handles the calculation layer)
COMMENT ON VIEW public.booking_dashboard IS 'Hardened view for Venue OS Dashboard (+Access Rights)';
