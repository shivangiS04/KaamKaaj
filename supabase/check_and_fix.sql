-- Check and Fix Script
-- Run this to see what's wrong and fix it

-- First, let's check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'goals', 'goal_cycles', 'achievements');

-- If you see the tables above, good! If not, the schema didn't run.

-- Now let's temporarily disable the trigger so we can create users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert, but don't fail if it errors
    BEGIN
        INSERT INTO public.profiles (id, name, email, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
            NEW.email,
            COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'employee'::user_role)
        )
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
