-- Add establishment_year column to plots table
ALTER TABLE public.plots 
ADD COLUMN establishment_year integer;

-- Set a default value for existing records (current year)
UPDATE public.plots 
SET establishment_year = EXTRACT(YEAR FROM created_at) 
WHERE establishment_year IS NULL;