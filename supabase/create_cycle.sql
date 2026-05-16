-- Create an active goal cycle for 2024
-- This allows employees to create goals

-- Temporarily disable the audit trigger
DROP TRIGGER IF EXISTS log_goal_cycles_changes ON goal_cycles;

-- Insert the goal cycle
INSERT INTO goal_cycles (year, phase_name, window_open_date, window_close_date, is_active)
VALUES (
    2024,
    'Annual Goal Setting 2024',
    '2024-01-01',
    '2024-12-31',
    true
);

-- Re-enable the audit trigger
CREATE TRIGGER log_goal_cycles_changes
    AFTER INSERT OR UPDATE OR DELETE ON goal_cycles
    FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Verify the cycle was created
SELECT * FROM goal_cycles;
