-- 1. Unique Yoco Payment ID Constraint
ALTER TABLE bookings
ADD CONSTRAINT IF NOT EXISTS unique_yoco_payment UNIQUE (yoco_payment_id);

-- 2. State Machine Enforcement
CREATE OR REPLACE FUNCTION enforce_booking_state_transition()
RETURNS trigger AS $$
BEGIN
    -- Allow initial insert or bypasses (null/pending to pending/confirmed)
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Allow pending to confirmed
    IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
        RETURN NEW;
    END IF;

    -- Allow pending to expired
    IF OLD.status = 'pending' AND NEW.status = 'expired' THEN
        RETURN NEW;
    END IF;

    -- Allow confirmed to cancelled
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Allow confirmed to completed
    IF OLD.status = 'confirmed' AND NEW.status = 'completed' THEN
        RETURN NEW;
    END IF;

    -- Allow confirmed to refunded
    IF OLD.status = 'confirmed' AND NEW.status = 'refunded' THEN
        RETURN NEW;
    END IF;

    -- Allow no-op status updates (e.g., updating just amount_paid on a confirmed booking)
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- If we get here, the transition is invalid
    RAISE EXCEPTION 'Invalid booking state transition: % -> %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_state_machine ON bookings;
CREATE TRIGGER booking_state_machine
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION enforce_booking_state_transition();

-- 3. Webhook Trigger to n8n
CREATE OR REPLACE FUNCTION trigger_booking_confirmed()
RETURNS trigger AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
        -- Call n8n directly from PostgreSQL
        -- Requires pg_net extension to be enabled in Supabase
        PERFORM net.http_post(
            url := 'https://n8n.srv1127912.hstgr.cloud/webhook/booking-confirmed',
            headers := '{"Content-Type":"application/json"}'::jsonb,
            body := json_build_object('booking_id', NEW.id, 'yoco_payment_id', NEW.yoco_payment_id)::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_confirmed_event ON bookings;
CREATE TRIGGER booking_confirmed_event
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_booking_confirmed();
