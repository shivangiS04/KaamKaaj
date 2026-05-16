SELECT * FROM goal_cycles;

UPDATE goal_cycles SET is_active = false WHERE is_active = true;

INSERT INTO goal_cycles (year, phase_name, window_open_date, window_close_date, is_active)
VALUES (2024, 'Annual Goal Setting 2024', '2024-01-01', '2024-12-31', true);

SELECT * FROM goal_cycles;
SELECT * FROM profiles ORDER BY role;
