-- Crear una inversión de ejemplo para Héctor Eduardo
-- Primero necesitamos obtener el ID de una especie de planta
INSERT INTO public.investments (
  user_id,
  species_id,
  plant_count,
  price_per_plant,
  total_amount,
  plantation_year,
  expected_harvest_year,
  status
)
SELECT 
  '463833c0-3a20-44cf-b35c-4d29c4998ace',
  ps.id,
  50,
  800.00,
  40000.00,
  2023,
  2048,
  'active'
FROM plant_species ps
WHERE ps.name ILIKE '%caoba%' OR ps.name ILIKE '%cedro%' OR ps.name ILIKE '%teca%'
LIMIT 1;

-- Actualizar el balance del usuario
UPDATE public.profiles 
SET account_balance = 40000.00
WHERE user_id = '463833c0-3a20-44cf-b35c-4d29c4998ace';