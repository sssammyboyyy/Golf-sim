-- 014_ghost_purge_rpc.sql
-- Purpose: Atomic cleanup for stale/abandoned 'pending' bookings.
-- Executes a hard delete to immediately release the PostgreSQL EXCLUDE USING gist constraint.

CREATE OR REPLACE FUNCTION public.purge_ghost_bookings()
RETURNS void AS $$
BEGIN
    /**
     * GHOST CLEANUP PROTOCOL
     * ----------------------
     * Deletes abandoned 'pending' bookings that have been stale for > 5 minutes.
     * This ensures 'two-bay' phantom bookings are cleared automatically.
     */
    DELETE FROM public.bookings
    WHERE (status = 'pending' OR payment_status = 'pending')
      AND created_at < (NOW() - INTERVAL '5 minutes')
      AND status NOT IN ('confirmed', 'cancelled', 'completed');
      
    RAISE NOTICE '[PURGE_GHOST_BOOKINGS] Cleanup cycle completed at %', now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to satisfy API consumption
GRANT EXECUTE ON FUNCTION public.purge_ghost_bookings TO main_api, service_role, anon, authenticated;
