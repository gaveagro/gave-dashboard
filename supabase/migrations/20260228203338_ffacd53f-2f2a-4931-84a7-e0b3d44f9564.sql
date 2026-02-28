
-- Fix has_role: add search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fix create_user_with_profile_v2: add search_path, admin check, random password
CREATE OR REPLACE FUNCTION public.create_user_with_profile_v2(user_email text, user_name text, user_role app_role DEFAULT 'investor'::app_role, user_balance numeric DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_user_id UUID;
  temp_password TEXT;
  result JSON;
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  new_user_id := gen_random_uuid();
  
  -- Generate cryptographically secure random password
  temp_password := encode(gen_random_bytes(32), 'base64');

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at,
    created_at, updated_at, raw_user_meta_data, is_super_admin, role, aud
  ) VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000', user_email,
    crypt(temp_password, gen_salt('bf')), NOW(), NOW(), NOW(), NOW(),
    jsonb_build_object('name', user_name, 'admin_created', true, 'email_confirmed', true, 'auto_confirmed', true),
    false, 'authenticated', 'authenticated'
  );

  INSERT INTO public.profiles (user_id, email, name, role, account_balance, created_at, updated_at)
  VALUES (new_user_id, user_email, user_name, user_role, user_balance, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role,
    account_balance = EXCLUDED.account_balance, updated_at = NOW();

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'temporary_password', temp_password,
    'message', 'Usuario creado exitosamente. Entregue la contraseña temporal de forma segura.'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Fix bulk_import_users: add search_path, admin check, random passwords
CREATE OR REPLACE FUNCTION public.bulk_import_users(users_data jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_record jsonb;
  new_user_id UUID;
  temp_password TEXT;
  imported_count integer := 0;
  error_count integer := 0;
  result json;
  errors text[] := array[]::text[];
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  FOR user_record IN SELECT * FROM jsonb_array_elements(users_data)
  LOOP
    BEGIN
      new_user_id := gen_random_uuid();
      temp_password := encode(gen_random_bytes(32), 'base64');
      
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, confirmed_at,
        created_at, updated_at, raw_user_meta_data, is_super_admin, role, aud
      ) VALUES (
        new_user_id, '00000000-0000-0000-0000-000000000000', user_record->>'email',
        crypt(temp_password, gen_salt('bf')), NOW(), NOW(), NOW(), NOW(),
        jsonb_build_object('name', user_record->>'name', 'admin_created', true, 'email_confirmed', true, 'auto_confirmed', true, 'bulk_imported', true),
        false, 'authenticated', 'authenticated'
      );

      INSERT INTO public.profiles (user_id, email, name, role, account_balance, phone, created_at, updated_at)
      VALUES (
        new_user_id, user_record->>'email', user_record->>'name',
        COALESCE((user_record->>'role')::app_role, 'investor'::app_role),
        COALESCE((user_record->>'balance')::numeric, 0),
        user_record->>'phone', NOW(), NOW()
      );
      
      imported_count := imported_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        errors := array_append(errors, 'Error with ' || (user_record->>'email') || ': ' || SQLERRM);
    END;
  END LOOP;

  result := json_build_object(
    'success', true,
    'imported_count', imported_count,
    'error_count', error_count,
    'errors', errors,
    'message', 'Importación completada: ' || imported_count || ' usuarios creados, ' || error_count || ' errores'
  );
  
  RETURN result;
END;
$function$;

-- Fix create_user_with_profile (3-param version): add search_path, admin check, random password
CREATE OR REPLACE FUNCTION public.create_user_with_profile(user_email text, user_name text, user_role app_role DEFAULT 'investor'::app_role)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_user_id UUID;
  temp_password TEXT;
  result JSON;
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  temp_password := encode(gen_random_bytes(32), 'base64');

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, confirmed_at, created_at, updated_at,
    raw_user_meta_data, is_super_admin, role
  ) VALUES (
    gen_random_uuid(), user_email, crypt(temp_password, gen_salt('bf')),
    NOW(), NOW(), NOW(), NOW(),
    jsonb_build_object('name', user_name, 'admin_created', true),
    false, 'authenticated'
  ) RETURNING id INTO new_user_id;

  UPDATE public.profiles SET role = user_role, name = user_name WHERE user_id = new_user_id;

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'temporary_password', temp_password,
    'message', 'Usuario creado exitosamente'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Fix create_user_with_profile (4-param version): add search_path, admin check, random password
CREATE OR REPLACE FUNCTION public.create_user_with_profile(user_email text, user_name text, user_role app_role DEFAULT 'investor'::app_role, user_balance numeric DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_user_id UUID;
  temp_password TEXT;
  result JSON;
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  temp_password := encode(gen_random_bytes(32), 'base64');

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, confirmed_at, created_at, updated_at,
    raw_user_meta_data, is_super_admin, role
  ) VALUES (
    gen_random_uuid(), user_email, crypt(temp_password, gen_salt('bf')),
    NOW(), NOW(), NOW(), NOW(),
    jsonb_build_object('name', user_name, 'admin_created', true, 'email_confirmed', true),
    false, 'authenticated'
  ) RETURNING id INTO new_user_id;

  UPDATE public.profiles SET role = user_role, name = user_name, account_balance = user_balance WHERE user_id = new_user_id;

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'temporary_password', temp_password,
    'message', 'Usuario creado exitosamente con email confirmado'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Fix request_password_reset: add search_path
CREATE OR REPLACE FUNCTION public.request_password_reset(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_exists boolean;
  reset_token text;
  result JSON;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = user_email
  ) INTO user_exists;

  IF NOT user_exists THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  reset_token := encode(gen_random_bytes(32), 'hex');

  UPDATE public.profiles 
  SET password_reset_token = reset_token, password_reset_expires = NOW() + INTERVAL '1 hour'
  WHERE email = user_email;

  RETURN json_build_object('success', true, 'reset_token', reset_token, 'message', 'Token de restablecimiento generado');
END;
$function$;

-- Fix send_investment_notification: add search_path
CREATE OR REPLACE FUNCTION public.send_investment_notification(user_email text, user_name text, user_phone text, plant_count integer, species_name text, establishment_year integer, total_investment numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result JSON;
BEGIN
  result := json_build_object(
    'success', true,
    'message', 'Notification request received',
    'data', json_build_object(
      'user_email', user_email, 'user_name', user_name, 'user_phone', user_phone,
      'plant_count', plant_count, 'species_name', species_name,
      'establishment_year', establishment_year, 'total_investment', total_investment
    )
  );
  RETURN result;
END;
$function$;
