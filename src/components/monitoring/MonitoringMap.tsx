import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MonitoringMapProps {
  plots?: any[];
}

const MonitoringMap: React.FC<MonitoringMapProps> = ({ plots = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Default center: San Luis Potosí, Mexico (Huasteca region)
    const defaultCenter: [number, number] = [22.15, -98.95];

    const map = L.map(mapContainer.current, {
      center: defaultCenter,
      zoom: 8,
      zoomControl: true,
    });

    // Esri satellite tiles
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 18,
      }
    ).addTo(map);

    // Labels overlay
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update plot markers when plots change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !plots?.length) return;

    const markers: L.Marker[] = [];
    const validCoords: [number, number][] = [];

    plots.forEach((plot) => {
      const lat = Number(plot.latitude);
      const lng = Number(plot.longitude);
      if (!isFinite(lat) || !isFinite(lng)) return;

      validCoords.push([lat, lng]);

      const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(
          `<strong>${plot.name}</strong><br/>${plot.location || ''}<br/>${plot.area ? plot.area + ' ha' : ''}`
        );
      markers.push(marker);
    });

    if (validCoords.length > 0) {
      map.fitBounds(L.latLngBounds(validCoords).pad(0.3));
    }

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [plots]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            🌍 {t('monitoring.plotsOverview')}
          </CardTitle>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            {plots?.length || 0} {t('nav.plots')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div
          ref={mapContainer}
          className="w-full h-[400px] rounded-lg overflow-hidden"
        />
      </CardContent>
    </Card>
  );
};

export default MonitoringMap;
