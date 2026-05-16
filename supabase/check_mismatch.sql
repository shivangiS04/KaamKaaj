-- Check auth.users IDs
SELECT id, email FROM auth.users ORDER BY email;

-- Check profiles IDs
SELECT id, email FROM profiles ORDER BY email;

-- Check if they match
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    p.id as profile_id,
    p.email as profile_email,
    CASE WHEN au.id = p.id THEN 'MATCH' ELSE 'MISMATCH' END as status
FROM auth.users au
FULL OUTER JOIN profiles p ON au.email = p.email
ORDER BY au.email;
