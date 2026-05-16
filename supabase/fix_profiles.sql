-- Fix profiles - manually insert them with correct data

-- Temporarily disable audit trigger
DROP TRIGGER IF EXISTS log_profiles_changes ON profiles;

-- Delete any existing NULL profiles
DELETE FROM profiles WHERE role IS NULL OR email IS NULL;

-- Insert profiles for each user
-- For admin@demo.com
INSERT INTO profiles (id, name, email, role)
SELECT id, 'Admin User', email, 'admin'::user_role
FROM auth.users
WHERE email = 'admin@demo.com'
ON CONFLICT (id) DO UPDATE 
SET name = 'Admin User', role = 'admin'::user_role;

-- For manager1@demo.com
INSERT INTO profiles (id, name, email, role)
SELECT id, 'Manager One', email, 'manager'::user_role
FROM auth.users
WHERE email = 'manager1@demo.com'
ON CONFLICT (id) DO UPDATE 
SET name = 'Manager One', role = 'manager'::user_role;

-- For employee1@demo.com
INSERT INTO profiles (id, name, email, role)
SELECT id, 'Employee One', email, 'employee'::user_role
FROM auth.users
WHERE email = 'employee1@demo.com'
ON CONFLICT (id) DO UPDATE 
SET name = 'Employee One', role = 'employee'::user_role;

-- Re-enable audit trigger
CREATE TRIGGER log_profiles_changes
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Verify the fix
SELECT id, name, email, role FROM profiles ORDER BY role;
