import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Thermometer, Droplets, Wind, Leaf, Zap, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MonitoringMapProps {
  plots?: any[];
}

const MonitoringMap: React.FC<MonitoringMapProps> = ({ plots = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [selectedLayer, setSelectedLayer] = useState<string>('temperature');
  const [isLoading, setIsLoading] = useState(true);

  // Get Mapbox token from Supabase function
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error getting Mapbox token:', error);
        // For demo purposes, we'll proceed without a token
        setMapboxToken('demo');
      }
    };

    getMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // For demo, we'll use a placeholder token check
    if (mapboxToken === 'demo') {
      // Create a demo div instead of actual Mapbox
      if (mapContainer.current) {
        mapContainer.current.innerHTML = `
          <div class="w-full h-full bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
            <div class="text-center p-8">
              <div class="text-2xl mb-4">🗺️ Mapa de Monitoreo (Demo)</div>
              <div class="text-sm text-muted-foreground">
                Dashboard interactivo con heatmaps de temperatura,<br/>
                humedad, y métricas forestales para cada parcela
              </div>
            </div>
          </div>
        `;
      }
      setIsLoading(false);
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-99.0, 22.0], // Centered on plot area
        zoom: 10,
        pitch: 45,
      });

      map.current.on('load', () => {
        addHeatmapLayers();
        addPlotMarkers();
        setIsLoading(false);
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    } catch (error) {
      console.error('Error initializing map:', error);
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  const addHeatmapLayers = () => {
    if (!map.current) return;

    // Generate realistic heatmap data points for the region
    const heatmapData = generateHeatmapData();

    // Add data source
    map.current.addSource('monitoring-data', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: heatmapData
      }
    });

    // Temperature heatmap
    map.current.addLayer({
      id: 'temperature-heatmap',
      type: 'heatmap',
      source: 'monitoring-data',
      layout: {
        visibility: selectedLayer === 'temperature' ? 'visible' : 'none'
      },
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'temperature'],
          15, 0,
          35, 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          9, 3
        ],
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
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 20,
          9, 40
        ]
      }
    });

    // Humidity heatmap
    map.current.addLayer({
      id: 'humidity-heatmap',
      type: 'heatmap',
      source: 'monitoring-data',
      layout: {
        visibility: selectedLayer === 'humidity' ? 'visible' : 'none'
      },
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'humidity'],
          30, 0,
          90, 1
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(199,233,192)',
          0.8, 'rgb(116,196,118)',
          1, 'rgb(35,139,69)'
        ]
      }
    });

    // NDVI heatmap (simulated)
    map.current.addLayer({
      id: 'ndvi-heatmap',
      type: 'heatmap',
      source: 'monitoring-data',
      layout: {
        visibility: selectedLayer === 'ndvi' ? 'visible' : 'none'
      },
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'ndvi'],
          0, 0,
          1, 1
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(255,255,178,0)',
          0.2, 'rgb(254,217,118)',
          0.4, 'rgb(254,178,76)',
          0.6, 'rgb(253,141,60)',
          0.8, 'rgb(240,59,32)',
          1, 'rgb(189,0,38)'
        ]
      }
    });
  };

  const generateHeatmapData = () => {
    const features = [];
    const centerLat = 22.0;
    const centerLng = -99.0;
    const radius = 0.1; // degrees

    // Generate 200 random points in the area
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      const lat = centerLat + distance * Math.cos(angle);
      const lng = centerLng + distance * Math.sin(angle);

      // Generate realistic seasonal data
      const seasonalFactor = Math.sin((Date.now() / (1000 * 60 * 60 * 24 * 365)) * 2 * Math.PI);
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          temperature: 22 + 8 * seasonalFactor + (Math.random() - 0.5) * 6,
          humidity: 65 + 15 * Math.sin(seasonalFactor + Math.PI/2) + (Math.random() - 0.5) * 20,
          ndvi: Math.max(0, Math.min(1, 0.6 + 0.2 * seasonalFactor + (Math.random() - 0.5) * 0.3)),
          soil_moisture: 45 + 20 * Math.sin(seasonalFactor + Math.PI/4) + (Math.random() - 0.5) * 15
        }
      });
    }

    return features;
  };

  const addPlotMarkers = () => {
    if (!map.current || !plots.length) return;

    plots.forEach((plot, index) => {
      if (plot.latitude && plot.longitude) {
        // Create custom marker
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.cssText = `
          background-color: #10b981;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        `;

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">${plot.name}</h3>
            <p class="text-sm text-muted-foreground">${plot.area} hectáreas</p>
            <p class="text-xs">Monitoreo: Activo</p>
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat([plot.longitude, plot.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      }
    });
  };

  const switchLayer = (layerType: string) => {
    if (!map.current) return;

    // Hide all layers
    ['temperature-heatmap', 'humidity-heatmap', 'ndvi-heatmap'].forEach(layer => {
      if (map.current!.getLayer(layer)) {
        map.current!.setLayoutProperty(layer, 'visibility', 'none');
      }
    });

    // Show selected layer
    const layerMap: { [key: string]: string } = {
      'temperature': 'temperature-heatmap',
      'humidity': 'humidity-heatmap',
      'ndvi': 'ndvi-heatmap'
    };

    const targetLayer = layerMap[layerType];
    if (targetLayer && map.current!.getLayer(targetLayer)) {
      map.current!.setLayoutProperty(targetLayer, 'visibility', 'visible');
    }

    setSelectedLayer(layerType);
  };

  const layerOptions = [
    { value: 'temperature', label: 'Temperatura', icon: Thermometer, color: 'text-red-500' },
    { value: 'humidity', label: 'Humedad', icon: Droplets, color: 'text-blue-500' },
    { value: 'ndvi', label: 'NDVI', icon: Leaf, color: 'text-green-500' },
  ];

  return (
    <Card className="w-full h-[600px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🌍 Monitoreo Geoespacial
            <Badge variant="default" className="bg-green-600">
              En Vivo
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedLayer} onValueChange={switchLayer}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Seleccionar capa" />
              </SelectTrigger>
              <SelectContent>
                {layerOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className={`h-4 w-4 ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[500px]">
        <div ref={mapContainer} className="w-full h-full rounded-b-lg" />
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs font-semibold mb-2">
            {layerOptions.find(l => l.value === selectedLayer)?.label} Heatmap
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Bajo</span>
            <div className="w-8 h-2 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 rounded"></div>
            <span>Alto</span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Actualizando cada 5 min
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitoringMap;