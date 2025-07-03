-- Create admin profile for existing admin@gaveagro.com user
INSERT INTO public.profiles (user_id, email, name, role, account_balance)
SELECT 
  id, 
  email, 
  'Administrator', 
  'admin'::app_role,
  0
FROM auth.users 
WHERE email = 'admin@gaveagro.com'
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.users.id);