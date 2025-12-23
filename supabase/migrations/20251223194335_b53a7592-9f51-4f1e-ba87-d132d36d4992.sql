-- Create table to store Agromonitoring polygon references
CREATE TABLE public.agromonitoring_polygons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
  polygon_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  geo_json JSONB NOT NULL,
  area_hectares NUMERIC,
  center_lat NUMERIC,
  center_lng NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to store satellite/weather data from Agromonitoring
CREATE TABLE public.agromonitoring_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  polygon_id TEXT NOT NULL,
  data_type TEXT NOT NULL,
  measurement_date DATE NOT NULL,
  ndvi_min NUMERIC,
  ndvi_max NUMERIC,
  ndvi_mean NUMERIC,
  ndvi_median NUMERIC,
  evi_min NUMERIC,
  evi_max NUMERIC,
  evi_mean NUMERIC,
  evi_median NUMERIC,
  ndwi_mean NUMERIC,
  satellite_image_url TEXT,
  satellite_image_type TEXT,
  cloud_coverage NUMERIC,
  temperature_celsius NUMERIC,
  humidity_percent NUMERIC,
  wind_speed_kmh NUMERIC,
  precipitation_mm NUMERIC,
  soil_temperature NUMERIC,
  soil_moisture NUMERIC,
  pressure_hpa NUMERIC,
  weather_description TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_polygon_date_type UNIQUE (polygon_id, measurement_date, data_type)
);

-- Enable RLS
ALTER TABLE public.agromonitoring_polygons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agromonitoring_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agromonitoring_polygons
CREATE POLICY "Admins can manage all polygons"
ON public.agromonitoring_polygons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view polygons for their invested plots"
ON public.agromonitoring_polygons
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM investments i
  WHERE i.plot_id = agromonitoring_polygons.plot_id
  AND i.user_id = auth.uid()
));

CREATE POLICY "Anyone can view all polygons"
ON public.agromonitoring_polygons
FOR SELECT
USING (true);

-- RLS Policies for agromonitoring_data
CREATE POLICY "Admins can manage all agromonitoring data"
ON public.agromonitoring_data
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view agromonitoring data"
ON public.agromonitoring_data
FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_agromonitoring_polygons_plot_id ON public.agromonitoring_polygons(plot_id);
CREATE INDEX idx_agromonitoring_data_polygon_id ON public.agromonitoring_data(polygon_id);
CREATE INDEX idx_agromonitoring_data_measurement_date ON public.agromonitoring_data(measurement_date);
CREATE INDEX idx_agromonitoring_data_type ON public.agromonitoring_data(data_type);

-- Add update trigger
CREATE TRIGGER update_agromonitoring_polygons_updated_at
BEFORE UPDATE ON public.agromonitoring_polygons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agromonitoring_data_updated_at
BEFORE UPDATE ON public.agromonitoring_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();