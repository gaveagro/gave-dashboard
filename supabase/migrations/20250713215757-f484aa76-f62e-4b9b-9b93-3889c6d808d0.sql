-- Add password reset functionality and user management improvements
-- Add password_reset_token and password_reset_expires to profiles table
ALTER TABLE public.profiles 
ADD COLUMN password_reset_token text,
ADD COLUMN password_reset_expires timestamp with time zone;

-- Modify plant_prices table to ensure unique combinations of species and year
ALTER TABLE public.plant_prices 
ADD CONSTRAINT plant_prices_species_year_unique UNIQUE (species_id, year);

-- Update the create_user_with_profile function to handle email confirmation better
CREATE OR REPLACE FUNCTION public.create_user_with_profile(user_email text, user_name text, user_role app_role DEFAULT 'investor'::app_role, user_balance numeric DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Insert directly into auth.users with confirmed status
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    gen_random_uuid(),
    user_email,
    crypt('TempPassword123!', gen_salt('bf')),
    NOW(), -- Auto-confirm email
    NOW(), -- Auto-confirm user
    NOW(),
    NOW(),
    jsonb_build_object('name', user_name, 'admin_created', true, 'email_confirmed', true),
    false,
    'authenticated'
  ) RETURNING id INTO new_user_id;

  -- Update the profile with the correct role and balance
  UPDATE public.profiles 
  SET 
    role = user_role, 
    name = user_name,
    account_balance = user_balance
  WHERE user_id = new_user_id;

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'Usuario creado exitosamente con email confirmado'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$function$;

-- Create function to reset user password
CREATE OR REPLACE FUNCTION public.request_password_reset(user_email text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_exists boolean;
  reset_token text;
  result JSON;
BEGIN
  -- Check if user exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = user_email
  ) INTO user_exists;

  IF NOT user_exists THEN
    result := json_build_object(
      'success', false,
      'error', 'Usuario no encontrado'
    );
    RETURN result;
  END IF;

  -- Generate reset token
  reset_token := encode(gen_random_bytes(32), 'hex');

  -- Update profile with reset token and expiry (1 hour from now)
  UPDATE public.profiles 
  SET 
    password_reset_token = reset_token,
    password_reset_expires = NOW() + INTERVAL '1 hour'
  WHERE email = user_email;

  result := json_build_object(
    'success', true,
    'reset_token', reset_token,
    'message', 'Token de restablecimiento generado'
  );
  
  RETURN result;
END;
$function$;

-- Update carbon capture calculation in plant_species table 
-- Based on the formula: 72 kg per plant total cycle, so 0.072 tonnes per plant total
UPDATE public.plant_species 
SET carbon_capture_per_plant = 0.072 
WHERE carbon_capture_per_plant IS NULL OR carbon_capture_per_plant = 0;