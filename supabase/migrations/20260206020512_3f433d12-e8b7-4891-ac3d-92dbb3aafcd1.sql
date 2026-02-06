-- Step 1: Change maturation_years column type to support decimals (5.5)
ALTER TABLE public.plant_species 
ALTER COLUMN maturation_years TYPE NUMERIC(3,1) USING maturation_years::NUMERIC(3,1);

-- Step 2: Update Espadín to 5.5 years maturation
UPDATE public.plant_species 
SET maturation_years = 5.5 
WHERE name = 'Espadín';

-- Step 3: Get the Espadín species ID for price updates
DO $$
DECLARE
  espadin_id UUID;
BEGIN
  SELECT id INTO espadin_id FROM public.plant_species WHERE name = 'Espadín';
  
  -- Update existing prices
  UPDATE public.plant_prices SET price_per_plant = 500 WHERE species_id = espadin_id AND year = 2021;
  UPDATE public.plant_prices SET price_per_plant = 450 WHERE species_id = espadin_id AND year = 2022;
  UPDATE public.plant_prices SET price_per_plant = 400 WHERE species_id = espadin_id AND year = 2023;
  UPDATE public.plant_prices SET price_per_plant = 350 WHERE species_id = espadin_id AND year = 2024;
  UPDATE public.plant_prices SET price_per_plant = 300 WHERE species_id = espadin_id AND year = 2025;
  
  -- Insert 2026 price if it doesn't exist
  INSERT INTO public.plant_prices (species_id, year, price_per_plant)
  VALUES (espadin_id, 2026, 250)
  ON CONFLICT DO NOTHING;
END $$;