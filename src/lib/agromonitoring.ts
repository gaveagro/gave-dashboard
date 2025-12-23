import { supabase } from '@/integrations/supabase/client';

export interface AgromonitoringPolygon {
  id: string;
  plot_id: string;
  polygon_id: string;
  name: string;
  geo_json: any;
  area_hectares: number | null;
  center_lat: number | null;
  center_lng: number | null;
  created_at: string;
}

export interface AgromonitoringData {
  id: string;
  polygon_id: string;
  data_type: string;
  measurement_date: string;
  ndvi_min: number | null;
  ndvi_max: number | null;
  ndvi_mean: number | null;
  ndvi_median: number | null;
  evi_min: number | null;
  evi_max: number | null;
  evi_mean: number | null;
  evi_median: number | null;
  ndwi_mean: number | null;
  satellite_image_url: string | null;
  satellite_image_type: string | null;
  cloud_coverage: number | null;
  temperature_celsius: number | null;
  humidity_percent: number | null;
  wind_speed_kmh: number | null;
  precipitation_mm: number | null;
  soil_temperature: number | null;
  soil_moisture: number | null;
  pressure_hpa: number | null;
  weather_description: string | null;
  raw_data: any;
  created_at: string;
}

// Create a polygon in Agromonitoring for a plot
export const createPolygon = async (plotId: string) => {
  const { data, error } = await supabase.functions.invoke('agromonitoring-polygon', {
    body: { action: 'create', plotId }
  });
  
  if (error) throw error;
  return data;
};

// Get polygon for a plot from our database
export const getPolygonByPlotId = async (plotId: string): Promise<AgromonitoringPolygon | null> => {
  const { data, error } = await supabase
    .from('agromonitoring_polygons')
    .select('*')
    .eq('plot_id', plotId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

// Fetch latest satellite data for a polygon
export const fetchSatelliteData = async (polygonId: string, startDate?: string, endDate?: string) => {
  const { data, error } = await supabase.functions.invoke('agromonitoring-satellite', {
    body: { action: 'fetch', polygonId, startDate, endDate }
  });
  
  if (error) throw error;
  return data;
};

// Get NDVI history for a polygon
export const getNdviHistory = async (polygonId: string, startDate?: string, endDate?: string) => {
  const { data, error } = await supabase.functions.invoke('agromonitoring-satellite', {
    body: { action: 'get-ndvi-history', polygonId, startDate, endDate }
  });
  
  if (error) throw error;
  return data;
};

// Fetch current weather for a polygon
export const fetchCurrentWeather = async (polygonId: string) => {
  const { data, error } = await supabase.functions.invoke('agromonitoring-weather', {
    body: { action: 'current', polygonId }
  });
  
  if (error) throw error;
  return data;
};

// Fetch soil data for a polygon
export const fetchSoilData = async (polygonId: string) => {
  const { data, error } = await supabase.functions.invoke('agromonitoring-weather', {
    body: { action: 'soil', polygonId }
  });
  
  if (error) throw error;
  return data;
};

// Get stored satellite data from database
export const getLatestSatelliteData = async (polygonId: string): Promise<AgromonitoringData | null> => {
  const { data, error } = await supabase
    .from('agromonitoring_data')
    .select('*')
    .eq('polygon_id', polygonId)
    .eq('data_type', 'satellite')
    .order('measurement_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

// Get stored weather data from database
export const getLatestWeatherData = async (polygonId: string): Promise<AgromonitoringData | null> => {
  const { data, error } = await supabase
    .from('agromonitoring_data')
    .select('*')
    .eq('polygon_id', polygonId)
    .eq('data_type', 'weather_current')
    .order('measurement_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

// Get stored soil data from database
export const getLatestSoilData = async (polygonId: string): Promise<AgromonitoringData | null> => {
  const { data, error } = await supabase
    .from('agromonitoring_data')
    .select('*')
    .eq('polygon_id', polygonId)
    .eq('data_type', 'soil')
    .order('measurement_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

// Get historical satellite data
export const getSatelliteHistory = async (polygonId: string, days: number = 90): Promise<AgromonitoringData[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('agromonitoring_data')
    .select('*')
    .eq('polygon_id', polygonId)
    .eq('data_type', 'satellite')
    .gte('measurement_date', startDate.toISOString().split('T')[0])
    .order('measurement_date', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

// Sync all data for all polygons
export const syncAllData = async () => {
  const [satelliteResult, weatherResult] = await Promise.all([
    supabase.functions.invoke('agromonitoring-satellite', {
      body: { action: 'sync-all' }
    }),
    supabase.functions.invoke('agromonitoring-weather', {
      body: { action: 'sync-all' }
    })
  ]);
  
  return {
    satellite: satelliteResult.data,
    weather: weatherResult.data
  };
};
