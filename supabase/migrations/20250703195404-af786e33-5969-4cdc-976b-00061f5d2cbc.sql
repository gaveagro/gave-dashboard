-- First, drop the trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the app_role enum (this should already exist, but ensuring it's there)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'investor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    CASE 
      WHEN NEW.email = 'admin@gaveagro.com' THEN 'admin'::app_role
      ELSE 'investor'::app_role
    END
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Remove the problematic RLS policies as requested
DROP POLICY IF EXISTS "Users can create investments" ON public.investments;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;