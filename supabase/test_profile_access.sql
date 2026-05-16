-- Test if profiles can be accessed
SELECT * FROM profiles WHERE email = 'admin@demo.com';

-- Check if RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';
