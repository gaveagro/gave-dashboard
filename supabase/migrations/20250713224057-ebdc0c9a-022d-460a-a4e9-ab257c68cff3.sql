-- Create a robust function for creating users with auto-confirmation and initial balance
CREATE OR REPLACE FUNCTION public.create_user_with_profile_v2(
  user_email text, 
  user_name text, 
  user_role app_role DEFAULT 'investor'::app_role, 
  user_balance numeric DEFAULT 0
) 
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Generate a new UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Insert directly into auth.users with auto-confirmation and temporary password
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    crypt('TempPassword123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object(
      'name', user_name, 
      'admin_created', true, 
      'email_confirmed', true,
      'auto_confirmed', true
    ),
    false,
    'authenticated',
    'authenticated'
  );

  -- Manually create the profile record (bypassing trigger)
  INSERT INTO public.profiles (
    user_id,
    email,
    name,
    role,
    account_balance,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    user_email,
    user_name,
    user_role,
    user_balance,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    account_balance = EXCLUDED.account_balance,
    updated_at = NOW();

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'Usuario creado exitosamente con confirmación automática'
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
$$;

-- Create function for bulk user import from CSV data
CREATE OR REPLACE FUNCTION public.bulk_import_users(
  users_data jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record jsonb;
  new_user_id UUID;
  imported_count integer := 0;
  error_count integer := 0;
  result json;
  errors text[] := array[]::text[];
BEGIN
  -- Loop through each user in the array
  FOR user_record IN SELECT * FROM jsonb_array_elements(users_data)
  LOOP
    BEGIN
      -- Generate a new UUID for each user
      new_user_id := gen_random_uuid();
      
      -- Insert into auth.users
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud
      ) VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        user_record->>'email',
        crypt('TempPassword123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object(
          'name', user_record->>'name',
          'admin_created', true,
          'email_confirmed', true,
          'auto_confirmed', true,
          'bulk_imported', true
        ),
        false,
        'authenticated',
        'authenticated'
      );

      -- Insert into profiles
      INSERT INTO public.profiles (
        user_id,
        email,
        name,
        role,
        account_balance,
        phone,
        created_at,
        updated_at
      ) VALUES (
        new_user_id,
        user_record->>'email',
        user_record->>'name',
        COALESCE((user_record->>'role')::app_role, 'investor'::app_role),
        COALESCE((user_record->>'balance')::numeric, 0),
        user_record->>'phone',
        NOW(),
        NOW()
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
$$;