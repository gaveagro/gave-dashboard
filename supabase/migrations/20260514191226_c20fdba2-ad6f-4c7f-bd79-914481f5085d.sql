
-- 1. Remove password_reset columns from profiles (sensitive data exposure)
DROP FUNCTION IF EXISTS public.request_password_reset(text);
ALTER TABLE public.profiles DROP COLUMN IF EXISTS password_reset_token;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS password_reset_expires;

-- 2. Prevent privilege escalation: stop self-update of role / account_balance via a trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins to do anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not allowed to change role';
  END IF;

  IF NEW.account_balance IS DISTINCT FROM OLD.account_balance THEN
    RAISE EXCEPTION 'Not allowed to change account_balance';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
