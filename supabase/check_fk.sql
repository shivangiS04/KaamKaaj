SELECT constraint_name, table_name, column_name 
FROM information_schema.key_column_usage 
WHERE table_name = 'profiles' AND constraint_name LIKE '%fkey%';
