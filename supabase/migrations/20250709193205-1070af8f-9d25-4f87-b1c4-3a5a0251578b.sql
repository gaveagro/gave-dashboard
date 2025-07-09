
-- Crear tabla para solicitudes de inversión
CREATE TABLE public.investment_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  user_phone text,
  plant_count integer NOT NULL,
  species_name text NOT NULL,
  establishment_year integer NOT NULL,
  total_investment numeric NOT NULL,
  weight_per_plant numeric NOT NULL,
  price_per_kg numeric NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all investment requests" 
  ON public.investment_requests 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own investment requests" 
  ON public.investment_requests 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investment requests" 
  ON public.investment_requests 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_investment_requests_updated_at
  BEFORE UPDATE ON public.investment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
