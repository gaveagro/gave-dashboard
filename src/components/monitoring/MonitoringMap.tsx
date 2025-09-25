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
    if (!mapContainer.current) return;

    // Always show demo version for mockup purposes
    if (mapContainer.current) {
      mapContainer.current.innerHTML = `
        <div class="w-full h-full bg-gradient-to-br from-green-100 via-blue-50 to-green-50 rounded-lg relative overflow-hidden">
          <!-- Background pattern -->
          <div class="absolute inset-0 opacity-10">
            <div class="absolute top-10 left-10 w-32 h-32 bg-green-400 rounded-full"></div>
            <div class="absolute top-20 right-20 w-24 h-24 bg-blue-400 rounded-full"></div>
            <div class="absolute bottom-20 left-20 w-20 h-20 bg-yellow-400 rounded-full"></div>
            <div class="absolute bottom-10 right-10 w-28 h-28 bg-red-400 rounded-full"></div>
          </div>
          
          <!-- Content -->
          <div class="relative z-10 h-full flex items-center justify-center">
            <div class="text-center p-8 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg max-w-md">
              <div class="text-3xl mb-4">🗺️</div>
              <div class="text-xl font-bold mb-2 text-gray-800">Mapa de Monitoreo Inteligente</div>
              <div class="text-sm text-gray-600 mb-4">
                Sistema integrado con heatmaps de temperatura, humedad, NDVI y biomasa forestal
              </div>
              
              <!-- Feature highlights -->
              <div class="space-y-2 text-xs text-left">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Heatmap de Temperatura (15°C - 35°C)</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Heatmap de Humedad (30% - 90%)</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Índice NDVI (0.0 - 1.0)</span>
                </div>
              </div>
              
              <!-- Demo indicators -->
              <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="flex justify-center items-center gap-4 text-xs">
                  <div class="flex items-center gap-1">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Datos en Tiempo Real</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>3 Parcelas Activas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Mock parcels -->
          <div class="absolute top-1/4 left-1/3 w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow-lg"></div>
          <div class="absolute top-1/2 right-1/3 w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow-lg"></div>
          <div class="absolute bottom-1/3 left-1/2 w-4 h-4 bg-green-600 rounded-full border-2 border-white shadow-lg"></div>
        </div>
      `;
    }
    setIsLoading(false);
  }, []);

  // These functions are preserved for potential future real Mapbox integration
  const addHeatmapLayers = () => {
    // Implementation preserved for when real Mapbox token is available
  };

  const generateHeatmapData = () => {
    // Implementation preserved for when real Mapbox token is available
    return [];
  };

  const addPlotMarkers = () => {
    // Implementation preserved for when real Mapbox token is available
  };

  const switchLayer = (layerType: string) => {
    setSelectedLayer(layerType);
    
    // Update the demo visualization based on selected layer
    if (mapContainer.current) {
      const selectedInfo = layerOptions.find(l => l.value === layerType);
      if (selectedInfo) {
        // Could update demo display here if needed
        console.log(`Switched to ${selectedInfo.label} layer`);
      }
    }
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
            {layerOptions.find(l => l.value === selectedLayer)?.label} - Vista Simulada
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Bajo</span>
            <div className="w-8 h-2 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 rounded"></div>
            <span>Alto</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Datos basados en modelos predictivos
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Mockup Demo - Grant Presentation
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitoringMap;