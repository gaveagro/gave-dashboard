import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface PlotMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

const PlotMap: React.FC<PlotMapProps> = ({ latitude, longitude, name }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, name, mapboxToken]);

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

  return <div ref={mapContainer} className="w-full h-64 rounded-lg overflow-hidden" />;
};

export default PlotMap;