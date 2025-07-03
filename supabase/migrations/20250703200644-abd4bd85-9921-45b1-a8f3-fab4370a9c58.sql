-- Insert admin profile manually if not exists
INSERT INTO public.profiles (user_id, email, name, role)
SELECT id, email, 'Admin', 'admin'::app_role
FROM auth.users 
WHERE email = 'admin@gaveagro.com' 
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = auth.users.id
);