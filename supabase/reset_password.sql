-- Reset password for admin user
-- This confirms the user's email

-- First, let's check if the user is confirmed
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin@demo.com';

-- If email_confirmed_at is NULL, confirm the user
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'admin@demo.com' AND email_confirmed_at IS NULL;

-- Verify the update
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin@demo.com';
