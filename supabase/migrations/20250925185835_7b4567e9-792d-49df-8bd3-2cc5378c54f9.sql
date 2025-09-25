-- Add unique constraint on plot_id for cecil_aois table
ALTER TABLE cecil_aois ADD CONSTRAINT cecil_aois_plot_id_unique UNIQUE (plot_id);

-- Create AOI for Aurelio Manrique plot
INSERT INTO cecil_aois (
  plot_id,
  name,
  external_ref,
  geometry,
  hectares,
  status,
  created_by
) VALUES (
  'a0d69545-cee3-4132-a121-c400d4435ac8',
  'Aurelio Manrique - Monitoreo Satelital',
  'aoi_aurelio_manrique_001',
  '{
    "type": "Polygon",
    "coordinates": [[
      [-98.659598, 22.306612],
      [-98.658500, 22.307000],
      [-98.657500, 22.306200],
      [-98.658000, 22.305800],
      [-98.659598, 22.306612]
    ]]
  }'::jsonb,
  25.0,
  'active',
  'f78500fb-4e4b-4ed6-92bb-afb729c55f53'
) ON CONFLICT (plot_id) DO UPDATE SET
  name = EXCLUDED.name,
  external_ref = EXCLUDED.external_ref,
  geometry = EXCLUDED.geometry,
  hectares = EXCLUDED.hectares,
  status = EXCLUDED.status,
  updated_at = now();