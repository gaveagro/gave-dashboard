-- Update Aurelio Manrique coordinates with correct polygon
UPDATE cecil_aois 
SET geometry = '{
  "type": "Polygon",
  "coordinates": [[
    [-98.65944444444445, 22.30638888888889],
    [-98.65777777777778, 22.307222222222222], 
    [-98.65777777777778, 22.305555555555557],
    [-98.66111111111111, 22.305555555555557],
    [-98.65944444444445, 22.30638888888889]
  ]]
}'::jsonb
WHERE id IN (
  SELECT ca.id 
  FROM cecil_aois ca 
  JOIN plots p ON p.id = ca.plot_id 
  WHERE p.name = 'Aurelio Manrique'
);