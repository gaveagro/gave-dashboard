-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'investor');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role app_role NOT NULL DEFAULT 'investor',
  account_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plots table
CREATE TABLE public.plots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  coordinates TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  area DECIMAL(8,2) NOT NULL, -- hectares
  total_plants INTEGER NOT NULL DEFAULT 0,
  available_plants INTEGER NOT NULL DEFAULT 0,
  soil_type TEXT,
  elevation INTEGER, -- meters
  rainfall INTEGER, -- mm annual
  temperature TEXT,
  status TEXT DEFAULT 'Activa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plant species table
CREATE TABLE public.plant_species (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  scientific_name TEXT,
  maturation_years INTEGER NOT NULL,
  min_weight_kg INTEGER NOT NULL,
  max_weight_kg INTEGER NOT NULL,
  carbon_capture_per_plant DECIMAL(4,2), -- tons CO2 per plant
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create investments table
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id UUID NOT NULL REFERENCES public.plant_species(id),
  plot_id UUID REFERENCES public.plots(id),
  plant_count INTEGER NOT NULL,
  price_per_plant DECIMAL(8,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  plantation_year INTEGER NOT NULL,
  expected_harvest_year INTEGER NOT NULL,
  weight_per_plant_kg INTEGER,
  status TEXT DEFAULT 'pending', -- pending, approved, active, harvested
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plot photos table
CREATE TABLE public.plot_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  description TEXT,
  taken_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES public.investments(id),
  document_type TEXT NOT NULL, -- contract, annual_report, payment_proof
  document_url TEXT NOT NULL,
  document_name TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, success, error
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plot_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for plots (public read, admin write)
CREATE POLICY "Anyone can view plots"
ON public.plots FOR SELECT
USING (true);

CREATE POLICY "Admins can manage plots"
ON public.plots FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for plant_species (public read, admin write)
CREATE POLICY "Anyone can view plant species"
ON public.plant_species FOR SELECT
USING (true);

CREATE POLICY "Admins can manage plant species"
ON public.plant_species FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for investments
CREATE POLICY "Users can view their own investments"
ON public.investments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all investments"
ON public.investments FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create investments"
ON public.investments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all investments"
ON public.investments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for plot_photos (public read, admin write)
CREATE POLICY "Anyone can view plot photos"
ON public.plot_photos FOR SELECT
USING (true);

CREATE POLICY "Admins can manage plot photos"
ON public.plot_photos FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all documents"
ON public.documents FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plots_updated_at
  BEFORE UPDATE ON public.plots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    CASE 
      WHEN NEW.email = 'admin@gaveagro.com' THEN 'admin'::app_role
      ELSE 'investor'::app_role
    END
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert sample data
INSERT INTO public.plant_species (name, scientific_name, maturation_years, min_weight_kg, max_weight_kg, carbon_capture_per_plant, description) VALUES
('Espadín', 'Agave angustifolia Haw', 5, 40, 60, 0.85, 'Especie principal de Gavé, ideal para mezcal'),
('Salmiana', 'Agave Salmiana ssp. Crassispina', 7, 60, 90, 0.92, 'Especie de crecimiento lento pero alto rendimiento'),
('Atrovirens', 'Agave atrovirens', 7, 60, 90, 0.90, 'Especie robusta con excelente adaptación');

INSERT INTO public.plots (name, location, coordinates, latitude, longitude, area, total_plants, available_plants, soil_type, elevation, rainfall, temperature, status) VALUES
('Parcela Norte', 'Oaxaca, México', '17.0732°N, 96.7266°W', 17.0732, -96.7266, 15.5, 3100, 2900, 'Franco-arenoso', 1580, 650, '18-25°C', 'Activa'),
('Parcela Sur', 'Oaxaca, México', '16.9252°N, 96.7266°W', 16.9252, -96.7266, 22.3, 4460, 4200, 'Arcillo-limoso', 1650, 780, '16-23°C', 'En desarrollo');

-- Insert sample plot photos
INSERT INTO public.plot_photos (plot_id, year, photo_url, description, taken_date) VALUES
((SELECT id FROM public.plots WHERE name = 'Parcela Norte'), 2024, '/placeholder-drone-north.jpg', 'Levantamiento aéreo Parcela Norte 2024', '2024-11-15'),
((SELECT id FROM public.plots WHERE name = 'Parcela Sur'), 2024, '/placeholder-drone-south.jpg', 'Levantamiento aéreo Parcela Sur 2024', '2024-10-20'),
((SELECT id FROM public.plots WHERE name = 'Parcela Norte'), 2023, '/placeholder-drone-north-2023.jpg', 'Levantamiento aéreo Parcela Norte 2023', '2023-11-10'),
((SELECT id FROM public.plots WHERE name = 'Parcela Sur'), 2023, '/placeholder-drone-south-2023.jpg', 'Levantamiento aéreo Parcela Sur 2023', '2023-10-15');