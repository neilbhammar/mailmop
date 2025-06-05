-- Fix duplicate welcome emails by removing the trigger on auth.users table
-- Keep only the trigger on profiles table since that's more reliable

-- Drop the welcome email trigger on auth.users table
DROP TRIGGER IF EXISTS send_welcome_email_trigger ON auth.users;

-- Drop the corresponding function as well since it's no longer needed
DROP FUNCTION IF EXISTS public.send_welcome_email();
DROP FUNCTION IF EXISTS public.send_welcome_email_with_data();

-- Add a comment to document the fix
COMMENT ON TRIGGER trigger_send_welcome_email ON public.profiles IS 
'Single trigger for welcome emails - fires when profile is created after user signup. Prevents duplicate emails.';

-- Verify we only have one welcome email trigger remaining
-- (This is just for logging purposes)
DO $$
DECLARE
    trigger_count integer;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name LIKE '%welcome%';
    
    RAISE LOG 'Number of welcome email triggers remaining: %', trigger_count;
END $$; 