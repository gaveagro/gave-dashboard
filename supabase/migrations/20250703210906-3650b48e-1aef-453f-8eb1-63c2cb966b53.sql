-- Crear una inversión de ejemplo para Héctor Eduardo
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
VALUES (
  '463833c0-3a20-44cf-b35c-4d29c4998ace',
  'b7188aaa-6a7d-4792-b474-09bb7f4cfd29', -- Espadín
  50,
  800.00,
  40000.00,
  2023,
  2028,
  'active'
);