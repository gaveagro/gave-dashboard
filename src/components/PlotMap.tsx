import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Layers, Maximize2, Minimize2, Map as MapIcon, Mountain } from 'lucide-react';
import NDVITimeSlider from '@/components/monitoring/NDVITimeSlider';
import { AgromonitoringData, AgromonitoringPolygon } from '@/lib/agromonitoring';
import { useLanguage } from '@/contexts/LanguageContext';

interface PlotMapProps {
  latitude: number;
  longitude: number;
  name: string;
  plotId?: string;
  polygon?: AgromonitoringPolygon | null;
  satelliteHistory?: AgromonitoringData[];
}

type BaseLayer = 'satellite' | 'street' | 'hybrid';

const PlotMap: React.FC<PlotMapProps> = ({
  latitude,
  longitude,
  name,
  plotId,
  polygon,
  satelliteHistory = [],
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const polygonLayerRef = useRef<L.GeoJSON | null>(null);
  const overlayLayerRef = useRef<L.ImageOverlay | null>(null);

  const [visible, setVisible] = useState(false);
  const [baseLayer, setBaseLayer] = useState<BaseLayer>('satellite');
  const [fullscreen, setFullscreen] = useState(false);
  const [activeFrame, setActiveFrame] = useState<AgromonitoringData | null>(
    satelliteHistory[satelliteHistory.length - 1] ?? null
  );

  // Lazy mount: only init the map once the card scrolls into view
  useEffect(() => {
    if (!containerRef.current) return;
    if (visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [visible]);

  const buildBaseLayer = useCallback((kind: BaseLayer) => {
    if (kind === 'street') {
      return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      });
    }
    return L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri', maxZoom: 19 }
    );
  }, []);

  // Initialize map after lazy mount
  useEffect(() => {
    if (!visible || !containerRef.current || mapRef.current) return;

    const validLat = Number.isFinite(latitude) ? latitude : 21.73;
    const validLng = Number.isFinite(longitude) ? longitude : -99.13;

    const map = L.map(containerRef.current, {
      center: [validLat, validLng],
      zoom: 16,
      zoomControl: true,
    });
    mapRef.current = map;

    // Base + labels
    baseLayerRef.current = buildBaseLayer('satellite').addTo(map);
    labelsLayerRef.current = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map);

    // Scale bar
    L.control.scale({ imperial: false, metric: true }).addTo(map);

    // Polygon overlay if available
    const geo = polygon?.geo_json as any;
    if (geo && (geo.geometry || geo.type === 'Polygon')) {
      try {
        const layer = L.geoJSON(geo, {
          style: {
            color: 'hsl(142 76% 36%)',
            weight: 2,
            opacity: 0.9,
            fillColor: 'hsl(142 76% 45%)',
            fillOpacity: 0.18,
          },
        }).addTo(map);
        polygonLayerRef.current = layer;
        try {
          map.fitBounds(layer.getBounds(), { padding: [40, 40] });
        } catch {/* empty */}
      } catch (err) {
        console.warn('PlotMap: failed to render polygon', err);
      }
    } else {
      L.marker([validLat, validLng])
        .bindPopup(
          `<div style="padding:4px 6px"><strong>${name}</strong><br/><span style="font-size:11px;color:#666">${validLat.toFixed(4)}°, ${validLng.toFixed(4)}°</span></div>`
        )
        .addTo(map);
    }

    // Force size in case container was hidden
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      overlayLayerRef.current?.remove();
      overlayLayerRef.current = null;
      polygonLayerRef.current?.remove();
      polygonLayerRef.current = null;
      labelsLayerRef.current?.remove();
      labelsLayerRef.current = null;
      baseLayerRef.current?.remove();
      baseLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Swap base layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }
    baseLayerRef.current = buildBaseLayer(baseLayer === 'street' ? 'street' : 'satellite').addTo(map);

    // Hybrid = satellite + labels; Satellite-only = no labels; Street = no labels
    if (labelsLayerRef.current) map.removeLayer(labelsLayerRef.current);
    if (baseLayer === 'hybrid') {
      labelsLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(map);
    } else {
      labelsLayerRef.current = null;
    }
  }, [baseLayer, buildBaseLayer]);

  // Render NDVI tile overlay for active frame
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !polygonLayerRef.current) return;
    overlayLayerRef.current?.remove();
    overlayLayerRef.current = null;
    const tileUrl = activeFrame?.satellite_image_url;
    if (!tileUrl) return;
    try {
      const bounds = polygonLayerRef.current.getBounds();
      overlayLayerRef.current = L.imageOverlay(tileUrl, bounds, { opacity: 0.7 }).addTo(map);
    } catch (err) {
      console.warn('NDVI overlay failed', err);
    }
  }, [activeFrame]);

  // Resize on fullscreen toggle
  useEffect(() => {
    if (!mapRef.current) return;
    const id = window.setTimeout(() => mapRef.current?.invalidateSize(), 200);
    return () => window.clearTimeout(id);
  }, [fullscreen]);

  return (
    <div ref={wrapperRef} className={fullscreen ? 'fixed inset-0 z-50 bg-background p-4 flex flex-col' : 'relative w-full'}>
      <div className="relative w-full flex-1">
        <div
          ref={containerRef}
          className={
            fullscreen
              ? 'w-full h-full rounded-lg overflow-hidden border'
              : 'w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden border border-muted'
          }
        >
          {!visible && (
            <div className="w-full h-full flex items-center justify-center bg-muted/20 text-xs text-muted-foreground">
              {t('map.loadingOnScroll')}
            </div>
          )}
        </div>

        {/* Layer toggle (top-right) */}
        {visible && (
          <Card className="absolute top-3 right-3 z-[1000] p-1 bg-background/95 backdrop-blur-sm shadow-md">
            <div className="flex gap-1">
              {([
                { id: 'satellite', icon: Layers, label: t('map.satellite') },
                { id: 'hybrid', icon: MapIcon, label: t('map.hybrid') },
                { id: 'street', icon: Mountain, label: t('map.street') },
              ] as const).map((opt) => (
                <Button
                  key={opt.id}
                  size="sm"
                  variant={baseLayer === opt.id ? 'default' : 'ghost'}
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setBaseLayer(opt.id)}
                  title={opt.label}
                >
                  <opt.icon className="h-3 w-3 mr-1" />
                  <span className="hidden md:inline">{opt.label}</span>
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setFullscreen((f) => !f)}
                title={fullscreen ? t('map.exitFullscreen') : t('map.fullscreen')}
              >
                {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Time slider for satellite history */}
      {visible && satelliteHistory.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] md:left-auto md:right-3 md:w-80">
          <NDVITimeSlider history={satelliteHistory} onFrameChange={setActiveFrame} />
        </div>
      )}
    </div>
  );
};

export default PlotMap;
