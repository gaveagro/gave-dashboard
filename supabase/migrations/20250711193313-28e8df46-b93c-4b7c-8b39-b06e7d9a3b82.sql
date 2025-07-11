-- Disable email confirmation requirement for new users
-- This allows admin to create users without requiring email confirmation

-- Update auth settings to skip email confirmation
-- Note: This will be handled through Supabase dashboard settings for now

-- Create a trigger to automatically confirm user emails when created by admin
CREATE OR REPLACE FUNCTION public.auto_confirm_admin_created_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-confirm users created with specific metadata
  IF NEW.raw_user_meta_data ? 'admin_created' THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-confirming admin-created users
DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_admin_created_users();