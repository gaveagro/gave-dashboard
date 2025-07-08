
-- Crear tabla para almacenamiento de precios históricos por especie y año
CREATE TABLE public.plant_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  species_id UUID NOT NULL REFERENCES public.plant_species(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  price_per_plant NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(species_id, year)
);

-- Habilitar RLS
ALTER TABLE public.plant_prices ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para precios
CREATE POLICY "Admins can manage plant prices" 
ON public.plant_prices 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view plant prices" 
ON public.plant_prices 
FOR SELECT 
USING (true);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_plant_prices_updated_at
  BEFORE UPDATE ON public.plant_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Crear bucket de almacenamiento para contratos e imágenes de dron
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('contracts', 'contracts', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']),  -- 50MB
  ('drone-photos', 'drone-photos', true, 104857600, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);  -- 100MB

-- Políticas de storage para contratos (privados)
CREATE POLICY "Admins can manage contracts" 
ON storage.objects 
FOR ALL 
TO authenticated
USING (bucket_id = 'contracts' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'contracts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own contracts" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'contracts' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = (storage.foldername(name))[1])
);

-- Políticas de storage para fotos de dron (públicas)
CREATE POLICY "Admins can manage drone photos" 
ON storage.objects 
FOR ALL 
TO authenticated
USING (bucket_id = 'drone-photos' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'drone-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view drone photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'drone-photos');

-- Actualizar tabla de documentos para incluir contratos
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS contract_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Crear índices para mejor rendimiento
CREATE INDEX idx_plant_prices_species_year ON public.plant_prices(species_id, year);
CREATE INDEX idx_documents_contract_type ON public.documents(contract_type) WHERE contract_type IS NOT NULL;
