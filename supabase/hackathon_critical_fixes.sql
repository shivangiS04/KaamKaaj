-- Hackathon Critical Fixes Migration
-- Run in Supabase SQL Editor after schema.sql

-- =============================================================================
-- 1. Score calculation helper + batch recalculation (backward compatibility)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_achievement_score(
    p_uom_type uom_type,
    p_target_value NUMERIC,
    p_actual_value NUMERIC,
    p_target_date DATE,
    p_actual_date DATE
) RETURNS NUMERIC AS $$
BEGIN
    CASE p_uom_type
        WHEN 'numeric_min' THEN
            IF p_actual_value IS NULL OR p_target_value IS NULL THEN RETURN NULL; END IF;
            IF p_target_value = 0 THEN RETURN 0; END IF;
            RETURN LEAST((p_actual_value / p_target_value) * 100, 100);
        WHEN 'numeric_max' THEN
            IF p_actual_value IS NULL OR p_target_value IS NULL THEN RETURN NULL; END IF;
            IF p_actual_value = 0 THEN RETURN 0; END IF;
            RETURN LEAST((p_target_value / p_actual_value) * 100, 100);
        WHEN 'timeline' THEN
            IF p_actual_date IS NULL OR p_target_date IS NULL THEN RETURN NULL; END IF;
            RETURN CASE WHEN p_actual_date <= p_target_date THEN 100 ELSE 0 END;
        WHEN 'zero' THEN
            IF p_actual_value IS NULL THEN RETURN NULL; END IF;
            RETURN CASE WHEN p_actual_value = 0 THEN 100 ELSE 0 END;
        ELSE
            RETURN NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.recalculate_numeric_achievement_scores()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE achievements a
    SET score = public.calculate_achievement_score(
        g.uom_type,
        g.target_value,
        a.actual_value,
        g.target_date,
        a.actual_date
    )
    FROM goals g
    WHERE a.goal_id = g.id
      AND g.uom_type IN ('numeric_min', 'numeric_max')
      AND a.shared_goal_assignment_id IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run once on deploy
SELECT public.recalculate_numeric_achievement_scores();

-- =============================================================================
-- 2. Check-in window enforcement (backend)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_checkin_window()
RETURNS TRIGGER AS $$
DECLARE
    v_cycle goal_cycles%ROWTYPE;
    v_now DATE := CURRENT_DATE;
BEGIN
    -- Admin bypass
    IF EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_cycle
    FROM goal_cycles
    WHERE is_active = TRUE
    LIMIT 1;

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

-- =============================================================================
-- 3. Shared goal achievement sync
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_shared_achievements()
RETURNS TRIGGER AS $$
BEGIN
    -- Only propagate from source (owner) achievements
    IF NEW.shared_goal_assignment_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO achievements (
        goal_id,
        shared_goal_assignment_id,
        quarter,
        actual_value,
        actual_date,
        progress_status,
        score
    )
    SELECT
        NEW.goal_id,
        sga.id,
        NEW.quarter,
        NEW.actual_value,
        NEW.actual_date,
        NEW.progress_status,
        NEW.score
    FROM shared_goal_assignments sga
    WHERE sga.source_goal_id = NEW.goal_id
    ON CONFLICT (goal_id, shared_goal_assignment_id, quarter)
    DO UPDATE SET
        actual_value = EXCLUDED.actual_value,
        actual_date = EXCLUDED.actual_date,
        progress_status = EXCLUDED.progress_status,
        score = EXCLUDED.score,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_shared_achievements_trigger ON achievements;
CREATE TRIGGER sync_shared_achievements_trigger
    AFTER INSERT OR UPDATE ON achievements
    FOR EACH ROW
    WHEN (NEW.shared_goal_assignment_id IS NULL)
    EXECUTE FUNCTION public.sync_shared_achievements();

-- Recompute scores on shared rows after sync (uses source goal targets)
CREATE OR REPLACE FUNCTION public.refresh_shared_achievement_scores()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shared_goal_assignment_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT public.calculate_achievement_score(
        g.uom_type,
        g.target_value,
        NEW.actual_value,
        g.target_date,
        NEW.actual_date
    )
    INTO NEW.score
    FROM goals g
    WHERE g.id = NEW.goal_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_shared_achievement_scores_trigger ON achievements;
CREATE TRIGGER refresh_shared_achievement_scores_trigger
    BEFORE INSERT OR UPDATE ON achievements
    FOR EACH ROW
    WHEN (NEW.shared_goal_assignment_id IS NOT NULL)
    EXECUTE FUNCTION public.refresh_shared_achievement_scores();

-- =============================================================================
-- 4. Shared goal assignment weightage constraint (10-100%)
-- =============================================================================

ALTER TABLE shared_goal_assignments
    DROP CONSTRAINT IF EXISTS shared_goal_assignments_weightage_check;

ALTER TABLE shared_goal_assignments
    ADD CONSTRAINT shared_goal_assignments_weightage_check
    CHECK (weightage >= 10 AND weightage <= 100);

-- Allow managers/admins to remove shared assignments
CREATE POLICY "Managers and Admins can delete shared goals" ON shared_goal_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('manager', 'admin')
        )
    );
