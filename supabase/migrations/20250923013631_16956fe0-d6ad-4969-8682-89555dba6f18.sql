-- Update duplicate plot names
UPDATE plots 
SET name = 'Ponciano Arriaga 2' 
WHERE name = 'Ponciano Arriaga' 
AND id != (
  SELECT id FROM plots 
  WHERE name = 'Ponciano Arriaga' 
  ORDER BY created_at ASC 
  LIMIT 1
);

UPDATE plots 
SET name = 'Tanchachin 2' 
WHERE name = 'Tanchachin' 
AND id != (
  SELECT id FROM plots 
  WHERE name = 'Tanchachin' 
  ORDER BY created_at ASC 
  LIMIT 1
);