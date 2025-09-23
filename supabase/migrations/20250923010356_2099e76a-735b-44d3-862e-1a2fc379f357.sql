-- Create cecil_aois table for storing Areas of Interest
CREATE TABLE public.cecil_aois (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plot_id UUID NOT NULL,
  external_ref TEXT NOT NULL UNIQUE, -- Unique reference for Cecil (based on plot_id)
  cecil_aoi_id UUID, -- ID returned by Cecil API
  name TEXT NOT NULL,
  geometry JSONB NOT NULL, -- GeoJSON geometry object in EPSG:4326
  hectares NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create cecil_data_requests table for tracking data acquisition
CREATE TABLE public.cecil_data_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cecil_aoi_id UUID NOT NULL REFERENCES public.cecil_aois(id) ON DELETE CASCADE,
  dataset_id TEXT NOT NULL, -- Cecil dataset ID (e.g., Kanop, Planet)
  dataset_name TEXT NOT NULL, -- Human readable name
  external_ref TEXT,
  cecil_request_id UUID, -- ID returned by Cecil API
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create cecil_transformations table for data transformations
CREATE TABLE public.cecil_transformations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_request_id UUID NOT NULL REFERENCES public.cecil_data_requests(id) ON DELETE CASCADE,
  cecil_transformation_id UUID, -- ID returned by Cecil API
  crs TEXT NOT NULL DEFAULT 'EPSG:4326',
  spatial_resolution NUMERIC NOT NULL DEFAULT 0.00025, -- degrees for EPSG:4326
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create cecil_satellite_data table for storing satellite-derived metrics
CREATE TABLE public.cecil_satellite_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cecil_aoi_id UUID NOT NULL REFERENCES public.cecil_aois(id) ON DELETE CASCADE,
  transformation_id UUID REFERENCES public.cecil_transformations(id),
  dataset_name TEXT NOT NULL,
  x NUMERIC NOT NULL, -- Longitude
  y NUMERIC NOT NULL, -- Latitude
  pixel_boundary JSONB, -- GeoJSON polygon for the pixel
  
  -- Vegetation indices
  ndvi NUMERIC,
  evi NUMERIC,
  savi NUMERIC,
  msavi NUMERIC,
  ndwi NUMERIC,
  
  -- Other metrics
  canopy_cover NUMERIC,
  biomass NUMERIC,
  carbon_capture NUMERIC,
  
  -- Metadata
  year INTEGER NOT NULL,
  month INTEGER,
  day INTEGER,
  measurement_date DATE,
  cloud_coverage NUMERIC,
  data_quality TEXT DEFAULT 'good', -- good, fair, poor
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cecil_weather_data table for meteorological data
CREATE TABLE public.cecil_weather_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cecil_aoi_id UUID NOT NULL REFERENCES public.cecil_aois(id) ON DELETE CASCADE,
  
  -- Weather measurements
  temperature_celsius NUMERIC,
  humidity_percent NUMERIC,
  precipitation_mm NUMERIC,
  wind_speed_kmh NUMERIC,
  wind_direction_degrees NUMERIC,
  pressure_hpa NUMERIC,
  solar_radiation_wm2 NUMERIC,
  
  -- Soil data
  soil_moisture_percent NUMERIC,
  soil_temperature_celsius NUMERIC,
  
  -- Metadata
  measurement_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  data_source TEXT NOT NULL, -- cecil, api, manual
  forecast_hours INTEGER, -- 0 for current, >0 for forecast
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cecil_alerts table for automated monitoring alerts
CREATE TABLE public.cecil_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cecil_aoi_id UUID NOT NULL REFERENCES public.cecil_aois(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- vegetation_stress, weather_alert, growth_anomaly, etc.
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  threshold_value NUMERIC,
  current_value NUMERIC,
  recommendation TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active', -- active, acknowledged, resolved, dismissed
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cecil_aois ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cecil_data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cecil_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cecil_satellite_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cecil_weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cecil_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cecil_aois
CREATE POLICY "Admins can manage all AOIs" 
ON public.cecil_aois 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view AOIs for their plots" 
ON public.cecil_aois 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.investments i 
    WHERE i.plot_id = cecil_aois.plot_id 
    AND i.user_id = auth.uid()
  )
);

-- Create RLS policies for cecil_data_requests
CREATE POLICY "Admins can manage all data requests" 
ON public.cecil_data_requests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view data requests for their AOIs" 
ON public.cecil_data_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cecil_aois a
    JOIN public.investments i ON i.plot_id = a.plot_id
    WHERE a.id = cecil_data_requests.cecil_aoi_id 
    AND i.user_id = auth.uid()
  )
);

-- Create RLS policies for cecil_transformations
CREATE POLICY "Admins can manage all transformations" 
ON public.cecil_transformations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view transformations for their data requests" 
ON public.cecil_transformations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cecil_data_requests dr
    JOIN public.cecil_aois a ON a.id = dr.cecil_aoi_id
    JOIN public.investments i ON i.plot_id = a.plot_id
    WHERE dr.id = cecil_transformations.data_request_id 
    AND i.user_id = auth.uid()
  )
);

-- Create RLS policies for cecil_satellite_data
CREATE POLICY "Admins can manage all satellite data" 
ON public.cecil_satellite_data 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view satellite data for their AOIs" 
ON public.cecil_satellite_data 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cecil_aois a
    JOIN public.investments i ON i.plot_id = a.plot_id
    WHERE a.id = cecil_satellite_data.cecil_aoi_id 
    AND i.user_id = auth.uid()
  )
);

-- Create RLS policies for cecil_weather_data
CREATE POLICY "Admins can manage all weather data" 
ON public.cecil_weather_data 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view weather data for their AOIs" 
ON public.cecil_weather_data 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cecil_aois a
    JOIN public.investments i ON i.plot_id = a.plot_id
    WHERE a.id = cecil_weather_data.cecil_aoi_id 
    AND i.user_id = auth.uid()
  )
);

-- Create RLS policies for cecil_alerts
CREATE POLICY "Admins can manage all alerts" 
ON public.cecil_alerts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view alerts for their AOIs" 
ON public.cecil_alerts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cecil_aois a
    JOIN public.investments i ON i.plot_id = a.plot_id
    WHERE a.id = cecil_alerts.cecil_aoi_id 
    AND i.user_id = auth.uid()
  )
);

CREATE POLICY "Users can acknowledge their alerts" 
ON public.cecil_alerts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.cecil_aois a
    JOIN public.investments i ON i.plot_id = a.plot_id
    WHERE a.id = cecil_alerts.cecil_aoi_id 
    AND i.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_cecil_aois_plot_id ON public.cecil_aois(plot_id);
CREATE INDEX idx_cecil_aois_cecil_id ON public.cecil_aois(cecil_aoi_id);
CREATE INDEX idx_cecil_aois_status ON public.cecil_aois(status);

CREATE INDEX idx_cecil_data_requests_aoi_id ON public.cecil_data_requests(cecil_aoi_id);
CREATE INDEX idx_cecil_data_requests_status ON public.cecil_data_requests(status);
CREATE INDEX idx_cecil_data_requests_dataset ON public.cecil_data_requests(dataset_id);

CREATE INDEX idx_cecil_transformations_request_id ON public.cecil_transformations(data_request_id);
CREATE INDEX idx_cecil_transformations_status ON public.cecil_transformations(status);

CREATE INDEX idx_cecil_satellite_aoi_id ON public.cecil_satellite_data(cecil_aoi_id);
CREATE INDEX idx_cecil_satellite_date ON public.cecil_satellite_data(measurement_date);
CREATE INDEX idx_cecil_satellite_year_month ON public.cecil_satellite_data(year, month);
CREATE INDEX idx_cecil_satellite_coords ON public.cecil_satellite_data(x, y);

CREATE INDEX idx_cecil_weather_aoi_id ON public.cecil_weather_data(cecil_aoi_id);
CREATE INDEX idx_cecil_weather_timestamp ON public.cecil_weather_data(measurement_timestamp);
CREATE INDEX idx_cecil_weather_forecast ON public.cecil_weather_data(forecast_hours);

CREATE INDEX idx_cecil_alerts_aoi_id ON public.cecil_alerts(cecil_aoi_id);
CREATE INDEX idx_cecil_alerts_status ON public.cecil_alerts(status);
CREATE INDEX idx_cecil_alerts_severity ON public.cecil_alerts(severity);
CREATE INDEX idx_cecil_alerts_type ON public.cecil_alerts(alert_type);

-- Create triggers for updated_at columns
CREATE TRIGGER update_cecil_aois_updated_at
  BEFORE UPDATE ON public.cecil_aois
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cecil_data_requests_updated_at
  BEFORE UPDATE ON public.cecil_data_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cecil_transformations_updated_at
  BEFORE UPDATE ON public.cecil_transformations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cecil_satellite_data_updated_at
  BEFORE UPDATE ON public.cecil_satellite_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cecil_weather_data_updated_at
  BEFORE UPDATE ON public.cecil_weather_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cecil_alerts_updated_at
  BEFORE UPDATE ON public.cecil_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();