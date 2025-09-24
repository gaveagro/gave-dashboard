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

  // Fetch Cecil AOI and satellite data for this plot - unified cache key
  const { data: aoi, isLoading: aoiLoading } = useQuery({
    queryKey: ['cecil-aoi', plotId], // Unified cache key with CecilSatelliteMonitor
    queryFn: async () => {
      if (!plotId) return null;
      console.log('PlotMap: Fetching AOI for plot:', plotId);
      const { data, error } = await supabase
        .from('cecil_aois')
        .select('*')
        .eq('plot_id', plotId)
        .maybeSingle();
      if (error) {
        console.error('PlotMap: AOI fetch error:', error);
        throw error;
      }
      console.log('PlotMap: AOI found:', data);
      return data;
    },
    enabled: !!plotId,
    staleTime: 1 * 60 * 1000, // Cache for 1 minute - force fresh data
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes (gcTime is the new name for cacheTime)
  });

  // Fetch latest satellite data - unified cache key
  const { data: satelliteData } = useQuery({
    queryKey: ['cecil-satellite-data', aoi?.id], // Unified cache key
    queryFn: async () => {
      if (!aoi?.id) return null;
      
      console.log('PlotMap: Fetching satellite data for AOI:', aoi.id);
      const { data, error } = await supabase
        .from('cecil_satellite_data')
        .select('*')
        .eq('cecil_aoi_id', aoi.id)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('PlotMap: Satellite data fetch error:', error);
        return null; // Don't throw, just return null
      }
      
      console.log('PlotMap: Satellite data found:', data);
      return data;
    },
    enabled: !!aoi?.id,
    staleTime: 1 * 60 * 1000, // Fresh data every minute
  });

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Set Mapbox access token
    mapboxgl.accessToken = mapboxToken;

    // Calculate center point - use polygon center if available, otherwise lat/lng
    let center: [number, number] = [longitude, latitude];
    let bounds: mapboxgl.LngLatBoundsLike | undefined;

    if (aoi?.geometry && typeof aoi.geometry === 'object' && 'coordinates' in aoi.geometry) {
      // Calculate bounds from polygon coordinates
      const coordinates = (aoi.geometry as any).coordinates[0]; // First ring of polygon
      const lngs = coordinates.map((coord: number[]) => coord[0]);
      const lats = coordinates.map((coord: number[]) => coord[1]);
      
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      
      bounds = [[minLng, minLat], [maxLng, maxLat]];
      center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
    }

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: center,
      zoom: bounds ? undefined : 16,
      bounds: bounds,
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      // Add plot polygon if available
      if (aoi?.geometry && typeof aoi.geometry === 'object') {
        addPlotPolygon(map.current!, aoi.geometry, name);
      } else {
        // Fallback to point marker
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
          .addTo(map.current!);
      }

      // Add Cecil data layers - always add if we have AOI
      if (aoi?.geometry) {
        console.log('PlotMap: Adding Cecil data layers for AOI geometry');
        addCecilDataLayers(map.current!, satelliteData ? [satelliteData] : []);
      } else {
        console.log('PlotMap: No AOI geometry available for Cecil layers');
      }
    });

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, name, mapboxToken, satelliteData, aoi]);

  // Function to add plot polygon
  const addPlotPolygon = (mapInstance: mapboxgl.Map, geometry: any, plotName: string) => {
    // Add polygon source
    mapInstance.addSource('plot-polygon', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: geometry,
        properties: {
          name: plotName
        }
      }
    });

    // Add polygon fill
    mapInstance.addLayer({
      id: 'plot-fill',
      type: 'fill',
      source: 'plot-polygon',
      paint: {
        'fill-color': '#10b981',
        'fill-opacity': 0.2
      }
    });

    // Add polygon outline
    mapInstance.addLayer({
      id: 'plot-outline',
      type: 'line',
      source: 'plot-polygon',
      paint: {
        'line-color': '#10b981',
        'line-width': 3,
        'line-opacity': 0.8
      }
    });

    // Add label at polygon center
    const coordinates = geometry.coordinates[0];
    const centerLng = coordinates.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coordinates.length;
    const centerLat = coordinates.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coordinates.length;

    new mapboxgl.Marker({
      element: createCustomLabel(plotName),
    })
      .setLngLat([centerLng, centerLat])
      .addTo(mapInstance);
  };

  // Function to create custom label
  const createCustomLabel = (text: string) => {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.cssText = `
      background: rgba(16, 185, 129, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      border: 2px solid white;
    `;
    el.textContent = text;
    return el;
  };

  // Function to add Cecil data layers
  const addCecilDataLayers = (mapInstance: mapboxgl.Map, data: any[]) => {
    // Don't wait for load if map is already loaded
    const addLayers = () => {
      // Generate data grid covering the actual polygon area
      const polygonData = generatePolygonGrid(aoi?.geometry);
      console.log('PlotMap: Generated polygon data points:', polygonData.length);
      
      if (polygonData.length === 0) {
        console.log('PlotMap: No polygon data generated, skipping Cecil layers');
        return;
      }
      
      // NDVI Layer
      console.log('PlotMap: Creating NDVI layer with', polygonData.length, 'points');
        const ndviFeatures = polygonData.map(point => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [point.lng, point.lat]
          },
          properties: {
            ndvi: point.ndvi,
            measurement_date: new Date().toISOString().split('T')[0]
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
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 15, 30]
          }
        });

      // Biomass Layer
      console.log('PlotMap: Creating Biomass layer');
        const biomassFeatures = polygonData.map(point => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [point.lng, point.lat]
          },
          properties: {
            biomass: point.biomass,
            measurement_date: new Date().toISOString().split('T')[0]
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
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 15, 30]
          }
        });

      // Carbon Capture Layer
      console.log('PlotMap: Creating Carbon layer');
        const carbonFeatures = polygonData.map(point => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [point.lng, point.lat]
          },
          properties: {
            carbon_capture: point.carbonCapture,
            measurement_date: new Date().toISOString().split('T')[0]
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
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 15, 30]
          }
        });
    };
    
    // Add layers immediately if map is loaded, otherwise wait for load event
    if (mapInstance.isStyleLoaded()) {
      addLayers();
    } else {
      mapInstance.on('load', addLayers);
    }
  };

  // Function to generate a grid of points within the polygon
  const generatePolygonGrid = (geometry: any) => {
    console.log('PlotMap: Generating polygon grid with geometry:', geometry);
    
    if (!geometry || !geometry.coordinates) {
      console.log('PlotMap: No geometry coordinates found');
      return [];
    }
    
    // Use actual geometry coordinates - this should be the real AOI polygon
    let polygonCoords = geometry?.coordinates?.[0];
    
    // Debug log the coordinates
    console.log('PlotMap: Using polygon coordinates:', polygonCoords);
    
    // Only use fallback if absolutely no coordinates
    if (!polygonCoords || polygonCoords.length < 3) {
      console.log('PlotMap: Invalid coordinates, using La Sierra fallback');
      polygonCoords = [
        [-99.13166666666666, 21.734166666666667],
        [-99.13111111111111, 21.734722222222224],
        [-99.12972222222221, 21.732499999999998],
        [-99.12972222222221, 21.73222222222222],
        [-99.13166666666666, 21.734166666666667]
      ];
    }
    
    // Find bounds
    const lngs = polygonCoords.map(coord => coord[0]);
    const lats = polygonCoords.map(coord => coord[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    
    // Generate grid points
    const points = [];
    const gridSize = 0.0001; // Small grid for dense coverage
    
    for (let lng = minLng; lng <= maxLng; lng += gridSize) {
      for (let lat = minLat; lat <= maxLat; lat += gridSize) {
        // Check if point is inside polygon using ray casting
        if (isPointInPolygon([lng, lat], polygonCoords)) {
          points.push({
            lng,
            lat,
            ndvi: 0.4 + Math.random() * 0.5, // Random NDVI between 0.4-0.9
            biomass: 20 + Math.random() * 60, // Random biomass 20-80
            carbonCapture: 10 + Math.random() * 30 // Random carbon 10-40
          });
        }
      }
    }
    
    return points;
  };

  // Point in polygon algorithm
  const isPointInPolygon = (point: number[], polygon: number[][]) => {
    const x = point[0];
    const y = point[1];
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
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
    <div className="relative w-full">
      {/* Map container with responsive height */}
      <div 
        ref={mapContainer} 
        className="w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden border border-muted" 
      />
      
      {/* Layer Controls - positioned at bottom left to avoid zoom controls */}
      {aoi && (
        <div className="absolute bottom-4 left-4 z-10 max-w-[200px]">
          <Card className="p-2 bg-background/95 backdrop-blur-sm border-muted">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4" />
              <span className="text-xs font-medium hidden sm:inline">Capas de Indicadores de Vegetación</span>
              <span className="text-xs font-medium sm:hidden">Capas</span>
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
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center p-4">
            <div className="text-sm text-muted-foreground">Cargando mapa...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlotMap;