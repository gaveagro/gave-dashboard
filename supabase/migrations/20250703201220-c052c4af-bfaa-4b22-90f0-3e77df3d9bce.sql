-- Ensure admin and investor example profiles exist
-- Note: The actual auth users must be created in Supabase Auth dashboard

-- Insert admin profile for admin@gaveagro.com if auth user exists
DO $$
BEGIN
  -- Check if admin@gaveagro.com auth user exists and create profile
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@gaveagro.com') THEN
    INSERT INTO public.profiles (user_id, email, name, role, account_balance)
    SELECT 
      id, 
      email, 
      'Administrator', 
      'admin'::app_role,
      0
    FROM auth.users 
    WHERE email = 'admin@gaveagro.com'
    ON CONFLICT (user_id) DO UPDATE SET 
      role = 'admin'::app_role,
      name = 'Administrator';
  END IF;

  -- Check if hectoreduardo.gox@gmail.com auth user exists and create profile
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'hectoreduardo.gox@gmail.com') THEN
    INSERT INTO public.profiles (user_id, email, name, role, account_balance)
    SELECT 
      id, 
      email, 
      'Hector Eduardo', 
      'investor'::app_role,
      10000.00
    FROM auth.users 
    WHERE email = 'hectoreduardo.gox@gmail.com'
    ON CONFLICT (user_id) DO UPDATE SET 
      role = 'investor'::app_role,
      name = 'Hector Eduardo',
      account_balance = 10000.00;
  END IF;
END $$;