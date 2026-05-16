-- Seed Data for Goal Setting & Tracking Portal
-- Run this after schema.sql

-- Insert demo users into auth.users (this would normally be done through Supabase Auth)
-- For demo purposes, we'll insert directly into profiles table
-- In production, use Supabase Auth signup API

-- Note: You need to create these users through Supabase Auth Dashboard or API first
-- Then run this script to set up their profiles and relationships

-- Sample user IDs (replace with actual UUIDs from your Supabase Auth users)
-- Admin: admin@demo.com / Admin@123
-- Manager1: manager1@demo.com / Manager@123
-- Manager2: manager2@demo.com / Manager@123
-- Employee1-4: employee1@demo.com ... employee4@demo.com / Employee@123

-- Insert profiles (assuming users are already created in auth.users)
-- You'll need to replace these UUIDs with actual ones from your Supabase project

-- Create a function to safely insert profiles if they don't exist
CREATE OR REPLACE FUNCTION insert_demo_profile(
    p_id UUID,
    p_name TEXT,
    p_email TEXT,
    p_role user_role,
    p_manager_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO profiles (id, name, email, role, manager_id)
    VALUES (p_id, p_name, p_email, p_role, p_manager_id)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        manager_id = EXCLUDED.manager_id;
END;
$$ LANGUAGE plpgsql;

-- Note: After creating users in Supabase Auth, get their UUIDs and insert profiles
-- Example structure (you'll need to update with actual UUIDs):

/*
-- Admin user
SELECT insert_demo_profile(
    'ADMIN_UUID_HERE'::UUID,
    'Admin User',
    'admin@demo.com',
    'admin'::user_role,
    NULL
);

-- Manager 1
SELECT insert_demo_profile(
    'MANAGER1_UUID_HERE'::UUID,
    'Manager One',
    'manager1@demo.com',
    'manager'::user_role,
    NULL
);

-- Manager 2
SELECT insert_demo_profile(
    'MANAGER2_UUID_HERE'::UUID,
    'Manager Two',
    'manager2@demo.com',
    'manager'::user_role,
    NULL
);

-- Employee 1 (reports to Manager 1)
SELECT insert_demo_profile(
    'EMPLOYEE1_UUID_HERE'::UUID,
    'Employee One',
    'employee1@demo.com',
    'employee'::user_role,
    'MANAGER1_UUID_HERE'::UUID
);

-- Employee 2 (reports to Manager 1)
SELECT insert_demo_profile(
    'EMPLOYEE2_UUID_HERE'::UUID,
    'Employee Two',
    'employee2@demo.com',
    'employee'::user_role,
    'MANAGER1_UUID_HERE'::UUID
);

-- Employee 3 (reports to Manager 2)
SELECT insert_demo_profile(
    'EMPLOYEE3_UUID_HERE'::UUID,
    'Employee Three',
    'employee3@demo.com',
    'employee'::user_role,
    'MANAGER2_UUID_HERE'::UUID
);

-- Employee 4 (reports to Manager 2)
SELECT insert_demo_profile(
    'EMPLOYEE4_UUID_HERE'::UUID,
    'Employee Four',
    'employee4@demo.com',
    'employee'::user_role,
    'MANAGER2_UUID_HERE'::UUID
);
*/

-- Insert active goal cycle for current year
INSERT INTO goal_cycles (year, phase_name, window_open_date, window_close_date, is_active)
VALUES (
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    'FY' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || ' Goal Setting',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '335 days',
    TRUE
)
ON CONFLICT DO NOTHING;

-- Insert sample goals for Employee 1 (replace EMPLOYEE1_UUID_HERE with actual UUID)
/*
WITH active_cycle AS (
    SELECT id FROM goal_cycles WHERE is_active = TRUE LIMIT 1
)
INSERT INTO goals (employee_id, goal_cycle_id, title, description, thrust_area, uom_type, target_value, target_date, weightage, status, is_shared, is_locked)
SELECT 
    'EMPLOYEE1_UUID_HERE'::UUID,
    active_cycle.id,
    'Increase Revenue by 20%',
    'Drive revenue growth through new customer acquisition and upselling',
    'Revenue Growth',
    'numeric_min'::uom_type,
    120,
    NULL,
    30,
    'approved'::goal_status,
    FALSE,
    TRUE
FROM active_cycle
UNION ALL
SELECT 
    'EMPLOYEE1_UUID_HERE'::UUID,
    active_cycle.id,
    'Improve Customer Satisfaction Score',
    'Achieve CSAT score of 4.5 or higher',
    'Customer Satisfaction',
    'numeric_min'::uom_type,
    4.5,
    NULL,
    25,
    'approved'::goal_status,
    FALSE,
    TRUE
FROM active_cycle
UNION ALL
SELECT 
    'EMPLOYEE1_UUID_HERE'::UUID,
    active_cycle.id,
    'Launch New Product Feature',
    'Complete and launch the new analytics dashboard',
    'Product Innovation',
    'timeline'::uom_type,
    NULL,
    CURRENT_DATE + INTERVAL '180 days',
    25,
    'approved'::goal_status,
    FALSE,
    TRUE
FROM active_cycle
UNION ALL
SELECT 
    'EMPLOYEE1_UUID_HERE'::UUID,
    active_cycle.id,
    'Reduce Customer Churn',
    'Reduce churn rate to below 5%',
    'Customer Satisfaction',
    'numeric_max'::uom_type,
    5,
    NULL,
    20,
    'approved'::goal_status,
    FALSE,
    TRUE
FROM active_cycle;
*/

-- Insert sample goals for Employee 2 (draft status)
/*
WITH active_cycle AS (
    SELECT id FROM goal_cycles WHERE is_active = TRUE LIMIT 1
)
INSERT INTO goals (employee_id, goal_cycle_id, title, description, thrust_area, uom_type, target_value, target_date, weightage, status, is_shared, is_locked)
SELECT 
    'EMPLOYEE2_UUID_HERE'::UUID,
    active_cycle.id,
    'Complete Team Training Program',
    'Train all team members on new processes',
    'Team Development',
    'timeline'::uom_type,
    NULL,
    CURRENT_DATE + INTERVAL '90 days',
    40,
    'draft'::goal_status,
    FALSE,
    FALSE
FROM active_cycle
UNION ALL
SELECT 
    'EMPLOYEE2_UUID_HERE'::UUID,
    active_cycle.id,
    'Improve Process Efficiency',
    'Reduce processing time by 30%',
    'Operational Excellence',
    'numeric_max'::uom_type,
    70,
    NULL,
    30,
    'draft'::goal_status,
    FALSE,
    FALSE
FROM active_cycle
UNION ALL
SELECT 
    'EMPLOYEE2_UUID_HERE'::UUID,
    active_cycle.id,
    'Zero Safety Incidents',
    'Maintain zero safety incidents throughout the year',
    'Compliance & Risk',
    'zero'::uom_type,
    0,
    NULL,
    30,
    'draft'::goal_status,
    FALSE,
    FALSE
FROM active_cycle;
*/

-- Insert sample achievements for Employee 1 Q1
/*
WITH employee1_goals AS (
    SELECT id, uom_type, target_value, target_date
    FROM goals
    WHERE employee_id = 'EMPLOYEE1_UUID_HERE'::UUID
    AND status = 'approved'::goal_status
)
INSERT INTO achievements (goal_id, quarter, actual_value, actual_date, progress_status, score)
SELECT 
    id,
    'Q1'::quarter_type,
    CASE 
        WHEN uom_type = 'numeric_min' THEN 115
        WHEN uom_type = 'numeric_max' THEN 6
        WHEN uom_type = 'timeline' THEN NULL
        ELSE NULL
    END,
    CASE 
        WHEN uom_type = 'timeline' THEN CURRENT_DATE - INTERVAL '10 days'
        ELSE NULL
    END,
    'on_track'::progress_status,
    CASE 
        WHEN uom_type = 'numeric_min' THEN 95.83
        WHEN uom_type = 'numeric_max' THEN 83.33
        WHEN uom_type = 'timeline' THEN 100
        ELSE NULL
    END
FROM employee1_goals;
*/

-- Create a view for easy reporting
CREATE OR REPLACE VIEW goal_achievement_report AS
SELECT 
    p.name AS employee_name,
    p.email AS employee_email,
    m.name AS manager_name,
    g.title AS goal_title,
    g.thrust_area,
    g.uom_type,
    g.target_value,
    g.target_date,
    g.weightage,
    g.status AS goal_status,
    a.quarter,
    a.actual_value,
    a.actual_date,
    a.progress_status,
    a.score,
    gc.year AS cycle_year,
    gc.phase_name AS cycle_phase
FROM goals g
JOIN profiles p ON g.employee_id = p.id
LEFT JOIN profiles m ON p.manager_id = m.id
LEFT JOIN achievements a ON g.id = a.goal_id
JOIN goal_cycles gc ON g.goal_cycle_id = gc.id
ORDER BY p.name, g.created_at, a.quarter;

-- Grant access to the view
GRANT SELECT ON goal_achievement_report TO authenticated;

-- Create a function to get completion statistics
CREATE OR REPLACE FUNCTION get_completion_stats()
RETURNS TABLE (
    total_employees BIGINT,
    employees_with_goals BIGINT,
    employees_with_submitted_goals BIGINT,
    employees_with_approved_goals BIGINT,
    total_goals BIGINT,
    draft_goals BIGINT,
    submitted_goals BIGINT,
    approved_goals BIGINT,
    returned_goals BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(DISTINCT id) FROM profiles WHERE role = 'employee') AS total_employees,
        (SELECT COUNT(DISTINCT employee_id) FROM goals) AS employees_with_goals,
        (SELECT COUNT(DISTINCT employee_id) FROM goals WHERE status = 'submitted') AS employees_with_submitted_goals,
        (SELECT COUNT(DISTINCT employee_id) FROM goals WHERE status = 'approved') AS employees_with_approved_goals,
        (SELECT COUNT(*) FROM goals) AS total_goals,
        (SELECT COUNT(*) FROM goals WHERE status = 'draft') AS draft_goals,
        (SELECT COUNT(*) FROM goals WHERE status = 'submitted') AS submitted_goals,
        (SELECT COUNT(*) FROM goals WHERE status = 'approved') AS approved_goals,
        (SELECT COUNT(*) FROM goals WHERE status = 'returned') AS returned_goals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instructions for setting up demo data:
-- 1. Create users in Supabase Auth Dashboard with the following credentials:
--    - admin@demo.com / Admin@123
--    - manager1@demo.com / Manager@123
--    - manager2@demo.com / Manager@123
--    - employee1@demo.com / Employee@123
--    - employee2@demo.com / Employee@123
--    - employee3@demo.com / Employee@123
--    - employee4@demo.com / Employee@123
--
-- 2. Get the UUIDs of the created users from auth.users table
--
-- 3. Uncomment and update the INSERT statements above with actual UUIDs
--
-- 4. Run this script in Supabase SQL Editor
