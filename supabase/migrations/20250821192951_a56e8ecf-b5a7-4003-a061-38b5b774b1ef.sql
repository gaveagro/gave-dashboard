-- Add demo role to app_role enum (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'investor');
    END IF;
    
    BEGIN
        ALTER TYPE app_role ADD VALUE 'demo';
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Create demo profile directly (the user will be created through auth context)
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
  '00000000-0000-0000-0000-000000000001',
  'demo@gaveagro.com',
  'Usuario Demo',
  'demo'::app_role,
  500000,
  '+52 555 123 4567',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  role = 'demo'::app_role,
  name = 'Usuario Demo',
  account_balance = 500000,
  phone = '+52 555 123 4567';

-- Insert demo investments (only if species exist)
DO $$
DECLARE
    species1_id uuid;
    species2_id uuid;
BEGIN
    -- Get first species
    SELECT id INTO species1_id FROM plant_species LIMIT 1;
    -- Get second species
    SELECT id INTO species2_id FROM plant_species OFFSET 1 LIMIT 1;
    
    IF species1_id IS NOT NULL THEN
        INSERT INTO public.investments (
          id,
          user_id,
          species_id,
          plant_count,
          total_amount,
          price_per_plant,
          plantation_year,
          expected_harvest_year,
          weight_per_plant_kg,
          status,
          created_at
        ) VALUES 
        (
          '10000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000001',
          species1_id,
          2500,
          750000,
          300,
          2020,
          2028,
          50,
          'active',
          '2020-03-15 10:00:00'
        ),
        (
          '10000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000001',
          species1_id,
          1800,
          540000,
          300,
          2022,
          2030,
          50,
          'active',
          '2022-07-20 14:30:00'
        ) ON CONFLICT (id) DO NOTHING;
        
        IF species2_id IS NOT NULL THEN
            INSERT INTO public.investments (
              id,
              user_id,
              species_id,
              plant_count,
              total_amount,
              price_per_plant,
              plantation_year,
              expected_harvest_year,
              weight_per_plant_kg,
              status,
              created_at
            ) VALUES (
              '10000000-0000-0000-0000-000000000003',
              '00000000-0000-0000-0000-000000000001',
              species2_id,
              3200,
              960000,
              300,
              2021,
              2029,
              50,
              'active',
              '2021-11-10 09:15:00'
            ) ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
END $$;

-- Create RLS policies for demo user
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'investments' 
        AND policyname = 'Demo user can view demo investments'
    ) THEN
        CREATE POLICY "Demo user can view demo investments" 
        ON public.investments 
        FOR SELECT 
        USING (user_id = '00000000-0000-0000-0000-000000000001');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'investment_requests' 
        AND policyname = 'Demo user can view demo investment requests'
    ) THEN
        CREATE POLICY "Demo user can view demo investment requests" 
        ON public.investment_requests 
        FOR SELECT 
        USING (user_id = '00000000-0000-0000-0000-000000000001');
    END IF;
END $$;

-- Create demo notifications
INSERT INTO public.notifications (
  id,
  user_id,
  title,
  message,
  type,
  read,
  created_at
) VALUES 
(
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Bienvenido al Demo de Gavé',
  'Este es un panel de demostración con datos ficticios para que explores nuestras funcionalidades.',
  'info',
  false,
  NOW() - INTERVAL '2 days'
),
(
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Inversión Demo Actualizada',
  'Tus plantaciones de demostración están creciendo según lo esperado. El progreso se actualiza automáticamente.',
  'success',
  false,
  NOW() - INTERVAL '5 days'
) ON CONFLICT (id) DO NOTHING;