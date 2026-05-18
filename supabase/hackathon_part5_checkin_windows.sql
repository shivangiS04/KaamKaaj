ALTER TABLE goal_cycles
ADD COLUMN IF NOT EXISTS checkin_windows jsonb
DEFAULT '{"Q1": false, "Q2": false, "Q3": false, "Q4": false}';

