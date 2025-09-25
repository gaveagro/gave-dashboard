-- Add sample satellite data for Aurelio Manrique
INSERT INTO cecil_satellite_data (
  cecil_aoi_id,
  x,
  y,
  year,
  month,
  day,
  measurement_date,
  dataset_name,
  ndvi,
  evi,
  savi,
  ndwi,
  biomass,
  carbon_capture,
  canopy_cover,
  cloud_coverage,
  data_quality
) SELECT 
  ca.id as cecil_aoi_id,
  -98.659598 + (random() - 0.5) * 0.002 as x,
  22.306612 + (random() - 0.5) * 0.002 as y,
  2024 as year,
  generate_series(1, 6) as month,
  15 as day,
  ('2024-' || generate_series(1, 6)::text || '-15')::date as measurement_date,
  'KANOP' as dataset_name,
  0.45 + random() * 0.3 as ndvi,
  0.28 + random() * 0.3 as evi,
  0.22 + random() * 0.2 as savi,
  -0.1 + random() * 0.3 as ndwi,
  80 + random() * 40 as biomass,
  15 + random() * 15 as carbon_capture,
  40 + random() * 25 as canopy_cover,
  random() * 30 as cloud_coverage,
  'good' as data_quality
FROM cecil_aois ca 
JOIN plots p ON p.id = ca.plot_id 
WHERE p.name = 'Aurelio Manrique';