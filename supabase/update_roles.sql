-- Update user roles in profiles table
-- This sets the correct roles for our demo users

UPDATE profiles 
SET role = 'admin', name = 'Admin User'
WHERE email = 'admin@demo.com';

UPDATE profiles 
SET role = 'manager', name = 'Manager One'
WHERE email = 'manager1@demo.com';

UPDATE profiles 
SET role = 'employee', name = 'Employee One'
WHERE email = 'employee1@demo.com';

-- Verify the updates
SELECT id, name, email, role FROM profiles ORDER BY role;
