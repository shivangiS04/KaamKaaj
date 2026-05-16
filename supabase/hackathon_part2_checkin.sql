-- Part 2/4: Check-in window trigger
CREATE OR REPLACE FUNCTION public.enforce_checkin_window()
RETURNS TRIGGER AS $$
DECLARE
    v_cycle goal_cycles%ROWTYPE;
    v_now DATE := CURRENT_DATE;
BEGIN
    IF EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_cycle FROM goal_cycles WHERE is_active = TRUE LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active goal cycle found';
    END IF;

    IF v_now < v_cycle.window_open_date THEN
        RAISE EXCEPTION 'Check-in window has not opened yet';
    END IF;

    IF v_now > v_cycle.window_close_date THEN
        RAISE EXCEPTION 'Check-in window is closed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_checkin_window_trigger ON achievements;
CREATE TRIGGER enforce_checkin_window_trigger
    BEFORE INSERT OR UPDATE ON achievements
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_checkin_window();
