-- Part 3/4: Shared goal achievement sync triggers
CREATE OR REPLACE FUNCTION public.sync_shared_achievements()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shared_goal_assignment_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO achievements (
        goal_id, shared_goal_assignment_id, quarter,
        actual_value, actual_date, progress_status, score
    )
    SELECT
        NEW.goal_id, sga.id, NEW.quarter,
        NEW.actual_value, NEW.actual_date, NEW.progress_status, NEW.score
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

CREATE OR REPLACE FUNCTION public.refresh_shared_achievement_scores()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shared_goal_assignment_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT public.calculate_achievement_score(
        g.uom_type, g.target_value, NEW.actual_value, g.target_date, NEW.actual_date
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
