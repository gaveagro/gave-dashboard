import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface PlotMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

const PlotMap: React.FC<PlotMapProps> = ({ latitude, longitude, name }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Note: You'll need to get a Mapbox token for production
    // For now, we'll show a placeholder
    const mapElement = mapContainer.current;
    mapElement.innerHTML = `
      <div class="w-full h-full bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed border-primary/20">
        <div class="text-center p-4">
          <div class="text-sm font-medium text-muted-foreground mb-2">Mapa de ${name}</div>
          <div class="text-xs text-muted-foreground">
            Coordenadas: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°
          </div>
          <div class="text-xs text-muted-foreground mt-2">
            <a 
              href="https://www.google.com/maps?q=${latitude},${longitude}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-primary hover:underline"
            >
              Ver en Google Maps
            </a>
          </div>
        </div>
      </div>
    `;

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, name]);

  return <div ref={mapContainer} className="w-full h-64" />;
};

export default PlotMap;