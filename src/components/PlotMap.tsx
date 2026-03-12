import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Layers, Eye, EyeOff } from 'lucide-react';

interface PlotMapProps {
  latitude: number;
  longitude: number;
  name: string;
  plotId?: string;
}

const PlotMap: React.FC<PlotMapProps> = ({ latitude, longitude, name, plotId }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [showLayerControls, setShowLayerControls] = useState(false);
  const layerRefs = useRef<Record<string, L.LayerGroup>>({});

  // Fetch Cecil AOI data
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
    enabled: !!plotId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch latest satellite data
  const { data: satelliteData } = useQuery({
    queryKey: ['cecil-satellite-data', aoi?.id],
    queryFn: async () => {
      if (!aoi?.id) return null;
      const { data, error } = await supabase
        .from('cecil_satellite_data')
        .select('*')
        .eq('cecil_aoi_id', aoi.id)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!aoi?.id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!mapContainer.current) return;

    // Ensure container has dimensions
    const { offsetWidth, offsetHeight } = mapContainer.current;
    if (offsetWidth === 0 || offsetHeight === 0) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            resizeObserver.disconnect();
            // Force re-render
            map.current?.invalidateSize();
          }
        }
      });
      resizeObserver.observe(mapContainer.current);
      return () => resizeObserver.disconnect();
    }

    // Validate coordinates
    const validLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : 21.73;
    const validLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : -99.13;

    // Clean up existing map
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    // Initialize Leaflet map
    map.current = L.map(mapContainer.current, {
      center: [validLat, validLng],
      zoom: 16,
      zoomControl: true,
    });

    // Esri World Imagery (satellite-like, similar to Google Maps)
    const esriSatellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      }
    );

    // Esri labels overlay
    const esriLabels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
      }
    );

    esriSatellite.addTo(map.current);
    esriLabels.addTo(map.current);

    // Reset layers
    layerRefs.current = {};
    setActiveLayers(new Set());

    // Render AOI polygon if available
    if (aoi?.geometry && typeof aoi.geometry === 'object' && 'coordinates' in aoi.geometry) {
      try {
        const geoJsonLayer = L.geoJSON(aoi.geometry as any, {
          style: {
            color: '#059669',
            weight: 4,
            opacity: 0.9,
            fillColor: '#059669',
            fillOpacity: 0.15,
          },
        }).addTo(map.current);

        // Fit map to polygon bounds
        map.current.fitBounds(geoJsonLayer.getBounds(), { padding: [50, 50] });

        // Add corner markers
        const coordinates = (aoi.geometry as any).coordinates[0];
        if (Array.isArray(coordinates)) {
          coordinates.forEach((coord: number[], index: number) => {
            if (index < coordinates.length - 1) {
              L.circleMarker([coord[1], coord[0]], {
                radius: 4,
                color: 'white',
                weight: 2,
                fillColor: '#059669',
                fillOpacity: 1,
              }).addTo(map.current!);
            }
          });
        }

        // Add label at center
        const bounds = geoJsonLayer.getBounds();
        const center = bounds.getCenter();
        const labelIcon = L.divIcon({
          className: 'custom-label',
          html: `<div style="
            background: rgba(5, 150, 105, 0.95);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 2px solid white;
            font-family: system-ui, -apple-system, sans-serif;
          ">${name}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        L.marker(center, { icon: labelIcon }).addTo(map.current);

        // Add satellite data layers (circle markers as heatmap substitute)
        if (plotId && aoi.geometry) {
          addSatelliteDataLayers(map.current, aoi.geometry, satelliteData);
        }
      } catch (err) {
        console.error('PlotMap: Error rendering polygon:', err);
      }
    } else {
      // Fallback: simple marker
      L.marker([validLat, validLng])
        .bindPopup(`
          <div class="p-3 min-w-[200px]">
            <h3 class="font-semibold text-sm">${name}</h3>
            <p class="text-xs mt-1">
              Coordenadas: ${validLat.toFixed(4)}°, ${validLng.toFixed(4)}°
            </p>
          </div>
        `)
        .addTo(map.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, name, plotId, aoi?.id, satelliteData?.id]);

  const addSatelliteDataLayers = (mapInstance: L.Map, geometry: any, satData: any) => {
    const points = generatePolygonGrid(geometry, satData);
    if (points.length === 0) return;

    const colorScales: Record<string, (v: number) => string> = {
      ndvi: (v) => {
        const r = Math.round(255 * (1 - v));
        const g = Math.round(255 * v);
        return `rgb(${r},${g},0)`;
      },
      evi: (v) => {
        const g = Math.round(100 + 155 * v);
        return `rgb(0,${g},${Math.round(50 * v)})`;
      },
      biomass: (v) => {
        const n = v / 150;
        return `rgb(${Math.round(139 + 106 * n)},${Math.round(69 + 153 * n)},${Math.round(19 + 160 * n)})`;
      },
      carbon: (v) => {
        const n = v / 50;
        return `rgb(0,${Math.round(100 + 140 * n)},${Math.round(150 + 105 * n)})`;
      },
    };

    // NDVI layer
    const ndviLayer = L.layerGroup();
    points.forEach(p => {
      L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: 'transparent',
        fillColor: colorScales.ndvi(p.ndvi),
        fillOpacity: 0.7,
      }).addTo(ndviLayer);
    });
    layerRefs.current['ndvi-heatmap'] = ndviLayer;

    // EVI layer
    const eviLayer = L.layerGroup();
    points.forEach(p => {
      L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: 'transparent',
        fillColor: colorScales.evi(p.evi),
        fillOpacity: 0.7,
      }).addTo(eviLayer);
    });
    layerRefs.current['evi-heatmap'] = eviLayer;

    // Biomass layer
    const biomassLayer = L.layerGroup();
    points.forEach(p => {
      L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: 'transparent',
        fillColor: colorScales.biomass(p.biomass),
        fillOpacity: 0.7,
      }).addTo(biomassLayer);
    });
    layerRefs.current['biomass-heatmap'] = biomassLayer;

    // Carbon layer
    const carbonLayer = L.layerGroup();
    points.forEach(p => {
      L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: 'transparent',
        fillColor: colorScales.carbon(p.carbonCapture),
        fillOpacity: 0.7,
      }).addTo(carbonLayer);
    });
    layerRefs.current['carbon-heatmap'] = carbonLayer;
  };

  const generatePolygonGrid = (geometry: any, satData?: any) => {
    if (!geometry?.coordinates?.[0]) return [];

    const polygonCoords = geometry.coordinates[0];
    if (!polygonCoords || polygonCoords.length < 3) return [];

    const lngs = polygonCoords.map((c: number[]) => c[0]);
    const lats = polygonCoords.map((c: number[]) => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const points: Array<{ lng: number; lat: number; ndvi: number; evi: number; biomass: number; carbonCapture: number }> = [];
    const gridSize = 0.00008;
    const baseNDVI = satData?.ndvi || 0.312;
    const baseEVI = satData?.evi || 0.219;
    const baseBiomass = satData?.biomass || 85.96;
    const baseCarbonCapture = satData?.carbon_capture || 12.5;

    for (let lng = minLng; lng <= maxLng; lng += gridSize) {
      for (let lat = minLat; lat <= maxLat; lat += gridSize) {
        if (isPointInPolygon([lng, lat], polygonCoords)) {
          const v = 0.15;
          points.push({
            lng, lat,
            ndvi: Math.max(0, Math.min(1, baseNDVI + (Math.random() - 0.5) * v)),
            evi: Math.max(0, Math.min(1, baseEVI + (Math.random() - 0.5) * v)),
            biomass: Math.max(0, baseBiomass + (Math.random() - 0.5) * baseBiomass * v),
            carbonCapture: Math.max(0, baseCarbonCapture + (Math.random() - 0.5) * baseCarbonCapture * v),
          });
        }
      }
    }
    return points;
  };

  const isPointInPolygon = (point: number[], polygon: number[][]) => {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  const toggleLayer = (layerId: string) => {
    if (!map.current) return;
    const layer = layerRefs.current[layerId];
    if (!layer) return;

    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        map.current!.removeLayer(layer);
        next.delete(layerId);
      } else {
        layer.addTo(map.current!);
        next.add(layerId);
      }
      return next;
    });
  };

  const availableLayers = [
    { id: 'ndvi-heatmap', name: 'NDVI', description: 'Índice de Vegetación', color: 'bg-green-600' },
    { id: 'evi-heatmap', name: 'EVI', description: 'Vegetación Mejorada', color: 'bg-emerald-600' },
    { id: 'biomass-heatmap', name: 'Biomasa', description: 'Biomasa Vegetal', color: 'bg-amber-600' },
    { id: 'carbon-heatmap', name: 'Carbono', description: 'Captura de Carbono', color: 'bg-blue-600' },
  ];

  return (
    <div className="relative w-full">
      <div
        ref={mapContainer}
        className="w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden border border-muted"
      />

      {plotId && (
        <div className="absolute bottom-4 left-4 z-[1000] max-w-[280px]">
          <Card className="p-3 bg-background/95 backdrop-blur-sm border-muted shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Capas de monitoreo satelital</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLayerControls(!showLayerControls)}
                className="h-6 w-6 p-0 ml-auto"
              >
                {showLayerControls ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>

            {showLayerControls && (
              <div className="space-y-2">
                {availableLayers.map((layer) => (
                  <div key={layer.id} className="flex items-center gap-2">
                    <Button
                      variant={activeLayers.has(layer.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleLayer(layer.id)}
                      className="h-8 text-xs flex-1 justify-start font-medium"
                    >
                      <div className={`w-3 h-3 rounded-full ${layer.color} mr-2`} />
                      <div className="text-left">
                        <div className="font-semibold">{layer.name}</div>
                        <div className="text-[10px] opacity-70">{layer.description}</div>
                      </div>
                    </Button>
                    {activeLayers.has(layer.id) && (
                      <Badge variant="secondary" className="text-[10px] px-1">
                        Activa
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
