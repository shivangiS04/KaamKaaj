-- Cleanup script - Run this FIRST to remove any partial schema
-- This will drop everything and start fresh

-- Drop triggers first
DROP TRIGGER IF EXISTS log_goal_cycles_changes ON goal_cycles;
DROP TRIGGER IF EXISTS log_profiles_changes ON profiles;
DROP TRIGGER IF EXISTS log_achievements_changes ON achievements;
DROP TRIGGER IF EXISTS log_goals_changes ON goals;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.log_changes();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS checkin_comments CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS shared_goal_assignments CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS goal_cycles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop enums
DROP TYPE IF EXISTS quarter_type CASCADE;
DROP TYPE IF EXISTS progress_status CASCADE;
DROP TYPE IF EXISTS uom_type CASCADE;
DROP TYPE IF EXISTS goal_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
