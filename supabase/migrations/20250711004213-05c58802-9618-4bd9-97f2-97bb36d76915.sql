-- Allow admin to create users by adding a bypass policy for profiles
CREATE POLICY "System can insert profiles during user creation"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- Update the handle_new_user function to handle admin creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

-- Add notifications table policies for admin management
CREATE POLICY "Admins can delete notifications"
ON public.notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update notifications"
ON public.notifications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete investments
CREATE POLICY "Admins can delete investments"
ON public.investments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add notifications table columns if needed
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger for notifications updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();