-- Update plant species weight ranges according to the provided specifications

-- Agave angustifolia (Espadín): 40-100 kg
UPDATE plant_species 
SET min_weight_kg = 40, max_weight_kg = 100 
WHERE name = 'Agave angustifolia' OR name ILIKE '%espadín%';

-- Agave potatorum (Tobalá): 8-25 kg
UPDATE plant_species 
SET min_weight_kg = 8, max_weight_kg = 25 
WHERE name = 'Agave potatorum' OR name ILIKE '%tobalá%';

-- Agave montana (Montana): 25-60 kg
UPDATE plant_species 
SET min_weight_kg = 25, max_weight_kg = 60 
WHERE name = 'Agave montana' OR name ILIKE '%montana%';

-- Agave salmiana (Salmiana): 80-200 kg
UPDATE plant_species 
SET min_weight_kg = 80, max_weight_kg = 200 
WHERE name = 'Agave salmiana' OR name ILIKE '%salmiana%';

-- Agave durangensis (Cenizo): 35-70 kg
UPDATE plant_species 
SET min_weight_kg = 35, max_weight_kg = 70 
WHERE name = 'Agave durangensis' OR name ILIKE '%cenizo%';

-- Agave cupreata (Papalote): 30-80 kg
UPDATE plant_species 
SET min_weight_kg = 30, max_weight_kg = 80 
WHERE name = 'Agave cupreata' OR name ILIKE '%papalote%';

-- Agave karwinskii (Cuishe, Barril): 20-70 kg
UPDATE plant_species 
SET min_weight_kg = 20, max_weight_kg = 70 
WHERE name = 'Agave karwinskii' OR name ILIKE '%cuishe%' OR name ILIKE '%barril%';

-- Agave americana var. oaxacensis (Arroqueño): 80-150 kg
UPDATE plant_species 
SET min_weight_kg = 80, max_weight_kg = 150 
WHERE name = 'Agave americana var. oaxacensis' OR name ILIKE '%arroqueño%';

-- Agave rhodacantha (Mexicano): 25-70 kg
UPDATE plant_species 
SET min_weight_kg = 25, max_weight_kg = 70 
WHERE name = 'Agave rhodacantha' OR name ILIKE '%mexicano%';

-- Agave marmorata (Tepeztate): 80-250 kg
UPDATE plant_species 
SET min_weight_kg = 80, max_weight_kg = 250 
WHERE name = 'Agave marmorata' OR name ILIKE '%tepeztate%';

-- Agave convallis (Jabalí): 20-60 kg
UPDATE plant_species 
SET min_weight_kg = 20, max_weight_kg = 60 
WHERE name = 'Agave convallis' OR name ILIKE '%jabalí%';

-- Agave atrovirens (Atrovirens): 100-300 kg
UPDATE plant_species 
SET min_weight_kg = 100, max_weight_kg = 300 
WHERE name = 'Agave atrovirens' OR name ILIKE '%atrovirens%';