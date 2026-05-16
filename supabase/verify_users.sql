-- Verify users exist and have correct roles

-- Check auth.users table
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at;

-- Check profiles table
SELECT id, name, email, role 
FROM profiles 
ORDER BY role;

-- Check if emails match between auth.users and profiles
SELECT 
    au.email as auth_email,
    p.email as profile_email,
    p.role,
    p.name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY p.role;
