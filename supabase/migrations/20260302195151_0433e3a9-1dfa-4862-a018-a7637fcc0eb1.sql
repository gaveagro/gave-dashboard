
-- Fix search_path on auto_confirm_admin_created_users
CREATE OR REPLACE FUNCTION public.auto_confirm_admin_created_users()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NEW.raw_user_meta_data ? 'admin_created' THEN
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix overly permissive RLS: replace WITH CHECK (true) on profiles INSERT
-- This policy allows the handle_new_user trigger to insert profiles
-- We scope it to only allow inserting a row matching the authenticated user's own ID
DROP POLICY IF EXISTS "System can insert profiles during user creation" ON public.profiles;
CREATE POLICY "System can insert profiles during user creation"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
