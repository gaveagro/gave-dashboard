-- Add phone field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT;

-- Create edge function for sending investment notifications
CREATE OR REPLACE FUNCTION public.send_investment_notification(
  user_email TEXT,
  user_name TEXT,
  user_phone TEXT,
  plant_count INTEGER,
  species_name TEXT,
  establishment_year INTEGER,
  total_investment NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- This function will be called from the frontend to trigger the email notification
  -- The actual email sending will be handled by an Edge Function
  result := json_build_object(
    'success', true,
    'message', 'Notification request received',
    'data', json_build_object(
      'user_email', user_email,
      'user_name', user_name,
      'user_phone', user_phone,
      'plant_count', plant_count,
      'species_name', species_name,
      'establishment_year', establishment_year,
      'total_investment', total_investment
    )
  );
  
  RETURN result;
END;
$$;