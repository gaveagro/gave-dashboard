import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Eye, EyeOff } from 'lucide-react';

interface PlotMapProps {
  latitude: number;
  longitude: number;
  name: string;
  plotId?: string;
}

const PlotMap: React.FC<PlotMapProps> = ({ latitude, longitude, name, plotId }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [showLayerControls, setShowLayerControls] = useState(false);

  // Fetch Mapbox token from Supabase secrets
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          setIsLoading(false);
          return;
        }
        setMapboxToken(data?.token);
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapboxToken();
  }, []);

  // Fetch Cecil AOI and satellite data for this plot
  const { data: aoi } = useQuery({
    queryKey: ['cecil-aoi', plotId],
    queryFn: async () => {
      if (!plotId) return null;
      const { data, error } = await supabase
        .from('cecil_aois')
        .select('*')
        .eq('plot_id', plotId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!plotId
  });

  // Fetch latest satellite data
  const { data: satelliteData } = useQuery({
    queryKey: ['cecil-satellite-data-map', aoi?.id],
    queryFn: async () => {
      if (!aoi?.id) return null;
      const { data, error } = await supabase
        .from('cecil_satellite_data')
        .select('*')
        .eq('cecil_aoi_id', aoi.id)
        .order('measurement_date', { ascending: false })
        .limit(50); // Get recent data points for heatmap
      if (error) throw error;
      return data;
    },
    enabled: !!aoi?.id
  });

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Set Mapbox access token
    mapboxgl.accessToken = mapboxToken;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [longitude, latitude],
      zoom: 16,
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add a marker for the plot location
    new mapboxgl.Marker({
      color: '#10b981',
      scale: 1.2,
    })
      .setLngLat([longitude, latitude])
      .setPopup(
        new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-semibold text-sm">${name}</h3>
            <p class="text-xs text-gray-600">
              ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°
            </p>
          </div>
        `)
      )
      .addTo(map.current);

    // Add Cecil data layers if available
    if (satelliteData && satelliteData.length > 0) {
      addCecilDataLayers(map.current, satelliteData);
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, name, mapboxToken, satelliteData]);

  // Function to add Cecil data layers
  const addCecilDataLayers = (mapInstance: mapboxgl.Map, data: any[]) => {
    mapInstance.on('load', () => {
      // NDVI Layer
      if (data.some(d => d.ndvi !== null)) {
        const ndviFeatures = data
          .filter(d => d.ndvi !== null && d.x !== null && d.y !== null)
          .map(d => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [d.x, d.y]
            },
            properties: {
              ndvi: d.ndvi,
              measurement_date: d.measurement_date
            }
          }));

        mapInstance.addSource('ndvi-data', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: ndviFeatures
          }
        });

        mapInstance.addLayer({
          id: 'ndvi-heatmap',
          type: 'heatmap',
          source: 'ndvi-data',
          layout: { 'visibility': 'none' },
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'ndvi'], 0, 0, 1, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20]
          }
        });
      }

      // Biomass Layer
      if (data.some(d => d.biomass !== null)) {
        const biomassFeatures = data
          .filter(d => d.biomass !== null && d.x !== null && d.y !== null)
          .map(d => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [d.x, d.y]
            },
            properties: {
              biomass: d.biomass,
              measurement_date: d.measurement_date
            }
          }));

        mapInstance.addSource('biomass-data', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: biomassFeatures
          }
        });

        mapInstance.addLayer({
          id: 'biomass-heatmap',
          type: 'heatmap',
          source: 'biomass-data',
          layout: { 'visibility': 'none' },
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'biomass'], 0, 0, 100, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0,104,55,0)',
              0.2, 'rgb(35,139,69)',
              0.4, 'rgb(65,171,93)',
              0.6, 'rgb(116,196,118)',
              0.8, 'rgb(161,217,155)',
              1, 'rgb(199,233,192)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20]
          }
        });
      }

      // Carbon Capture Layer
      if (data.some(d => d.carbon_capture !== null)) {
        const carbonFeatures = data
          .filter(d => d.carbon_capture !== null && d.x !== null && d.y !== null)
          .map(d => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [d.x, d.y]
            },
            properties: {
              carbon_capture: d.carbon_capture,
              measurement_date: d.measurement_date
            }
          }));

        mapInstance.addSource('carbon-data', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: carbonFeatures
          }
        });

        mapInstance.addLayer({
          id: 'carbon-heatmap',
          type: 'heatmap',
          source: 'carbon-data',
          layout: { 'visibility': 'none' },
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'carbon_capture'], 0, 0, 50, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(8,29,88,0)',
              0.2, 'rgb(37,52,148)',
              0.4, 'rgb(34,94,168)',
              0.6, 'rgb(29,145,192)',
              0.8, 'rgb(65,182,196)',
              1, 'rgb(127,205,187)'
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20]
          }
        });
      }
    });
  };

  // Toggle layer visibility
  const toggleLayer = (layerId: string) => {
    if (!map.current) return;
    
    const visibility = map.current.getLayoutProperty(layerId, 'visibility');
    const newVisibility = visibility === 'visible' ? 'none' : 'visible';
    
    map.current.setLayoutProperty(layerId, 'visibility', newVisibility);
    
    const newActiveLayers = new Set(activeLayers);
    if (newVisibility === 'visible') {
      newActiveLayers.add(layerId);
    } else {
      newActiveLayers.delete(layerId);
    }
    setActiveLayers(newActiveLayers);
  };

  const availableLayers = [
    { id: 'ndvi-heatmap', name: 'NDVI', color: 'bg-green-500' },
    { id: 'biomass-heatmap', name: 'Biomasa', color: 'bg-emerald-500' },
    { id: 'carbon-heatmap', name: 'Carbono', color: 'bg-blue-500' }
  ];


  if (isLoading) {
    return (
      <div className="w-full h-64 bg-muted/20 rounded-lg flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-sm text-muted-foreground">Cargando mapa...</div>
        </div>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className="w-full h-64 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-primary/20">
        <div className="text-center p-4">
          <div className="text-sm font-medium text-muted-foreground mb-2">Mapa de {name}</div>
          <div className="text-xs text-muted-foreground">
            Coordenadas: {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            <a 
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Ver en Google Maps
            </a>
          </div>
          <div className="text-xs text-red-500 mt-2">
            Token de Mapbox no configurado
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapContainer} className="w-full h-64 rounded-lg overflow-hidden" />
      
      {/* Layer Controls - only show if we have Cecil data */}
      {satelliteData && satelliteData.length > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <Card className="p-2">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4" />
              <span className="text-xs font-medium">Capas Cecil</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLayerControls(!showLayerControls)}
                className="h-6 w-6 p-0"
              >
                {showLayerControls ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            
            {showLayerControls && (
              <div className="space-y-1">
                {availableLayers.map(layer => (
                  <div key={layer.id} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleLayer(layer.id)}
                      className={`w-3 h-3 rounded-full border-2 ${
                        activeLayers.has(layer.id) 
                          ? `${layer.color} border-current` 
                          : 'bg-transparent border-gray-300'
                      }`}
                    />
                    <span className="text-xs">{layer.name}</span>
                    {activeLayers.has(layer.id) && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Activo
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default PlotMap;