-- Quick Setup - Run this in parts

-- PART 1: Disable audit logging completely
DROP TRIGGER IF EXISTS audit_trigger ON checkin_comments;
DROP TRIGGER IF EXISTS audit_trigger ON achievements;
DROP TRIGGER IF EXISTS audit_trigger ON shared_goal_assignments;
DROP TRIGGER IF EXISTS audit_trigger ON goals;
DROP TRIGGER IF EXISTS audit_trigger ON goal_cycles;
DROP TRIGGER IF EXISTS audit_trigger ON profiles;

-- Also drop old trigger names
DROP TRIGGER IF EXISTS log_goals_changes ON goals;
DROP TRIGGER IF EXISTS log_achievements_changes ON achievements;
DROP TRIGGER IF EXISTS log_goal_cycles_changes ON goal_cycles;
DROP TRIGGER IF EXISTS log_profiles_changes ON profiles;
DROP TRIGGER IF EXISTS log_shared_goal_assignments_changes ON shared_goal_assignments;
DROP TRIGGER IF EXISTS log_checkin_comments_changes ON checkin_comments;

-- Temporarily drop the function with CASCADE
DROP FUNCTION IF EXISTS log_changes() CASCADE;

-- PART 2: Clean up data
DELETE FROM checkin_comments;
DELETE FROM achievements;
DELETE FROM shared_goal_assignments;
DELETE FROM goals;
DELETE FROM goal_cycles;
DELETE FROM profiles;

-- PART 3: Check existing users
SELECT id, email FROM auth.users ORDER BY email;

-- PART 4: Create goal cycle (run this after you have users)
INSERT INTO goal_cycles (year, phase_name, window_open_date, window_close_date, is_active)
VALUES (2024, 'Annual Goal Setting 2024', '2024-01-01', '2024-12-31', true);

-- PART 5: Recreate the audit function
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_record JSONB;
    new_record JSONB;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_record := to_jsonb(OLD);
        INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', auth.uid(), old_record, NULL);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        old_record := to_jsonb(OLD);
        new_record := to_jsonb(NEW);
        INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', auth.uid(), old_record, new_record);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        new_record := to_jsonb(NEW);
        INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', auth.uid(), NULL, new_record);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 6: Recreate triggers
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION log_changes();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON goals FOR EACH ROW EXECUTE FUNCTION log_changes();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON goal_cycles FOR EACH ROW EXECUTE FUNCTION log_changes();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON achievements FOR EACH ROW EXECUTE FUNCTION log_changes();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON shared_goal_assignments FOR EACH ROW EXECUTE FUNCTION log_changes();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON checkin_comments FOR EACH ROW EXECUTE FUNCTION log_changes();
