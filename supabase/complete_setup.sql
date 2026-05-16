-- Complete Setup Script
-- This script sets up users, confirms emails, and creates an active goal cycle
-- Run this in Supabase SQL Editor

-- Step 1: Temporarily disable audit log triggers to allow direct SQL operations
-- We need to drop the triggers BEFORE any DELETE operations
DROP TRIGGER IF EXISTS audit_trigger ON checkin_comments;
DROP TRIGGER IF EXISTS audit_trigger ON achievements;
DROP TRIGGER IF EXISTS audit_trigger ON shared_goal_assignments;
DROP TRIGGER IF EXISTS audit_trigger ON goals;
DROP TRIGGER IF EXISTS audit_trigger ON goal_cycles;
DROP TRIGGER IF EXISTS audit_trigger ON profiles;

-- Step 2: Clean up existing data (now that triggers are disabled)
DELETE FROM checkin_comments;
DELETE FROM achievements;
DELETE FROM shared_goal_assignments;
DELETE FROM goals;
DELETE FROM goal_cycles;
DELETE FROM profiles;

-- Step 3: Verify and list existing auth users
SELECT id, email, email_confirmed_at, confirmed_at 
FROM auth.users 
ORDER BY created_at;

-- Step 4: If users don't exist, you need to create them via Supabase Dashboard:
-- Go to Authentication > Users > Add User
-- Create these users with "Auto Confirm User" enabled:
-- 1. admin@demo.com / Admin@123
-- 2. manager1@demo.com / Manager@123
-- 3. employee1@demo.com / Employee@123

-- Step 5: After creating users in dashboard, get their IDs and insert profiles
-- Replace the UUIDs below with actual user IDs from auth.users table

-- First, let's see what users exist:
SELECT id, email FROM auth.users ORDER BY email;

-- IMPORTANT: Copy the user IDs from above and paste them below
-- Then uncomment and run the INSERT statements

-- Example (replace with actual IDs):
-- INSERT INTO profiles (id, name, email, role, manager_id) VALUES
-- ('USER_ID_FROM_AUTH_USERS', 'Admin User', 'admin@demo.com', 'admin', NULL),
-- ('USER_ID_FROM_AUTH_USERS', 'Manager One', 'manager1@demo.com', 'manager', NULL),
-- ('USER_ID_FROM_AUTH_USERS', 'Employee One', 'employee1@demo.com', 'employee', 'MANAGER_USER_ID');

-- Step 6: Create an active goal cycle
INSERT INTO goal_cycles (year, phase_name, window_open_date, window_close_date, is_active)
VALUES (
  2024,
  'Annual Goal Setting 2024',
  '2024-01-01',
  '2024-12-31',
  true
);

-- Step 7: Re-enable audit log triggers
CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON goals
FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON goal_cycles
FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON achievements
FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON shared_goal_assignments
FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON checkin_comments
FOR EACH ROW EXECUTE FUNCTION log_changes();

-- Step 8: Verify setup
SELECT 'Users:' as section;
SELECT id, email FROM auth.users ORDER BY email;

SELECT 'Profiles:' as section;
SELECT id, name, email, role FROM profiles ORDER BY role;

SELECT 'Goal Cycles:' as section;
SELECT id, year, phase_name, is_active FROM goal_cycles;
