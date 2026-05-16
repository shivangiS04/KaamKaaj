-- Hackathon demo seed (run after schema + sync_profiles + hackathon_critical_fixes.sql)

UPDATE goal_cycles SET is_active = false WHERE is_active = true;
INSERT INTO goal_cycles (year, phase_name, window_open_date, window_close_date, is_active)
VALUES (
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  'Hackathon Demo Cycle',
  CURRENT_DATE - 7,
  CURRENT_DATE + 90,
  TRUE
);

DO $$
DECLARE
  v_cycle UUID;
  v_emp1 UUID;
  v_goal_revenue UUID;
  v_goal_response UUID;
BEGIN
  SELECT id INTO v_cycle FROM goal_cycles WHERE is_active = TRUE LIMIT 1;
  SELECT id INTO v_emp1 FROM profiles WHERE email = 'employee1@demo.com' LIMIT 1;

  IF v_cycle IS NULL OR v_emp1 IS NULL THEN
    RAISE NOTICE 'Skip demo seed: missing cycle or employee1 profile';
    RETURN;
  END IF;

  SELECT id INTO v_goal_revenue FROM goals
  WHERE employee_id = v_emp1 AND title = 'Increase Revenue by 20%' LIMIT 1;

  IF v_goal_revenue IS NULL THEN
    INSERT INTO goals (
      employee_id, goal_cycle_id, title, thrust_area, uom_type,
      target_value, weightage, status, is_shared, is_locked
    ) VALUES (
      v_emp1, v_cycle, 'Increase Revenue by 20%', 'Revenue Growth',
      'numeric_min', 100, 40, 'approved', FALSE, TRUE
    ) RETURNING id INTO v_goal_revenue;
  END IF;

  SELECT id INTO v_goal_response FROM goals
  WHERE employee_id = v_emp1 AND title = 'Reduce Support Response Time' LIMIT 1;

  IF v_goal_response IS NULL THEN
    INSERT INTO goals (
      employee_id, goal_cycle_id, title, thrust_area, uom_type,
      target_value, weightage, status, is_shared, is_locked
    ) VALUES (
      v_emp1, v_cycle, 'Reduce Support Response Time', 'Customer Satisfaction',
      'numeric_max', 5, 30, 'approved', FALSE, TRUE
    ) RETURNING id INTO v_goal_response;
  END IF;

  INSERT INTO achievements (goal_id, quarter, actual_value, progress_status, score)
  VALUES
    (v_goal_revenue, 'Q1', 120, 'on_track', 100),
    (v_goal_response, 'Q1', 3, 'completed', 100)
  ON CONFLICT (goal_id, shared_goal_assignment_id, quarter)
  DO UPDATE SET actual_value = EXCLUDED.actual_value, score = EXCLUDED.score;

  PERFORM public.recalculate_numeric_achievement_scores();
END $$;
