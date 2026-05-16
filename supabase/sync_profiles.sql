-- Delete old profiles
DELETE FROM profiles;

-- Insert new profiles with correct auth.users IDs
INSERT INTO profiles (id, name, email, role, manager_id)
SELECT 
    au.id,
    CASE 
        WHEN au.email = 'admin@demo.com' THEN 'Admin User'
        WHEN au.email = 'manager1@demo.com' THEN 'Manager One'
        WHEN au.email = 'employee1@demo.com' THEN 'Employee One'
    END as name,
    au.email,
    CASE 
        WHEN au.email = 'admin@demo.com' THEN 'admin'
        WHEN au.email = 'manager1@demo.com' THEN 'manager'
        WHEN au.email = 'employee1@demo.com' THEN 'employee'
    END::user_role as role,
    CASE 
        WHEN au.email = 'employee1@demo.com' THEN (SELECT id FROM auth.users WHERE email = 'manager1@demo.com')
        ELSE NULL
    END as manager_id
FROM auth.users au
WHERE au.email IN ('admin@demo.com', 'manager1@demo.com', 'employee1@demo.com');

-- Verify
SELECT p.id, p.name, p.email, p.role, au.id as auth_id
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.role;
