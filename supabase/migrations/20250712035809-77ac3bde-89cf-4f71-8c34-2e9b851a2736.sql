-- Add delete policy for reports (documents table) for admins
CREATE POLICY "Admins can delete documents" 
ON public.documents 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a function to handle user creation with proper service role access
CREATE OR REPLACE FUNCTION public.create_user_with_profile(
  user_email TEXT,
  user_name TEXT,
  user_role app_role DEFAULT 'investor'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Insert directly into auth.users (this will trigger our existing handle_new_user function)
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
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('name', user_name, 'admin_created', true),
    false,
    'authenticated'
  ) RETURNING id INTO new_user_id;

  -- Update the profile with the correct role
  UPDATE public.profiles 
  SET role = user_role, name = user_name
  WHERE user_id = new_user_id;

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'message', 'Usuario creado exitosamente'
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