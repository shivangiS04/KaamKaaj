-- Part 1/4: Score functions + recalculate existing achievements
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
        g.uom_type, g.target_value, a.actual_value, g.target_date, a.actual_date
    )
    FROM goals g
    WHERE a.goal_id = g.id
      AND g.uom_type IN ('numeric_min', 'numeric_max')
      AND a.shared_goal_assignment_id IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT public.recalculate_numeric_achievement_scores();
