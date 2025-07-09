
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, ExternalLink, Camera, Thermometer, Droplets, Mountain } from 'lucide-react';

const Plots = () => {
  const { data: plots, isLoading } = useQuery({
    queryKey: ['plots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plots')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: plotPhotos } = useQuery({
    queryKey: ['plot-photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plot_photos')
        .select('*')
        .order('year', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: investments } = useQuery({
    queryKey: ['investments-plots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investments')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: plantSpecies } = useQuery({
    queryKey: ['plant-species-plots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_species')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  const openInGoogleMaps = (coordinates: string) => {
    const cleanCoords = coordinates.replace(/[^\d.,-]/g, '');
    const url = `https://www.google.com/maps?q=${cleanCoords}`;
    window.open(url, '_blank');
  };

  const getPlotProgress = (plotId: string) => {
    const plotInvestments = investments?.filter(inv => inv.plot_id === plotId) || [];
    if (plotInvestments.length === 0) return 0;

    const currentYear = new Date().getFullYear();
    const totalProgress = plotInvestments.reduce((sum, inv) => {
      const species = plantSpecies?.find(s => s.id === inv.species_id);
      if (!species) return sum;
      
      const progress = Math.min(100, ((currentYear - inv.plantation_year) / species.maturation_years) * 100);
      return sum + progress;
    }, 0);

    return Math.round(totalProgress / plotInvestments.length);
  };

  const getNextHarvest = (plotId: string) => {
    const plotInvestments = investments?.filter(inv => inv.plot_id === plotId) || [];
    if (plotInvestments.length === 0) return null;

    return Math.min(...plotInvestments.map(inv => inv.expected_harvest_year));
  };

  const getPlantsEstablished = (plotId: string) => {
    const plotInvestments = investments?.filter(inv => inv.plot_id === plotId) || [];
    return plotInvestments.reduce((sum, inv) => sum + inv.plant_count, 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <p>Cargando parcelas...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Parcelas</h1>
        <p className="text-muted-foreground">
          Información detallada sobre nuestras parcelas de cultivo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {plots?.map((plot) => {
          const recentPhotos = plotPhotos?.filter(photo => photo.plot_id === plot.id) || [];
          const plotProgress = getPlotProgress(plot.id);
          const nextHarvest = getNextHarvest(plot.id);
          const plantsEstablished = getPlantsEstablished(plot.id);
          
          return (
            <Card key={plot.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {plot.name}
                    </CardTitle>
                    <CardDescription>{plot.location}</CardDescription>
                  </div>
                  <Badge variant={plot.status === 'Activa' ? 'default' : 'secondary'}>
                    {plot.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Información básica */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Área:</span>
                    <p>{plot.area} hectáreas</p>
                  </div>
                  <div>
                    <span className="font-medium">Plantas establecidas:</span>
                    <p>{plantsEstablished.toLocaleString()} de {plot.total_plants.toLocaleString()}</p>
                  </div>
                </div>

                {/* Progreso hacia la madurez */}
                {plotProgress > 0 && (
                  <div className="space-y-2 pt-3 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Progreso hacia cosecha</span>
                      <span>{plotProgress}%</span>
                    </div>
                    <Progress value={plotProgress} className="h-2" />
                    {nextHarvest && (
                      <p className="text-xs text-muted-foreground">
                        Próxima cosecha estimada: {nextHarvest}
                      </p>
                    )}
                  </div>
                )}

                {/* Condiciones ambientales */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t">
                  {plot.temperature && (
                    <div className="flex items-center gap-2 text-sm">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <span>{plot.temperature}</span>
                    </div>
                  )}
                  {plot.rainfall && (
                    <div className="flex items-center gap-2 text-sm">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span>{plot.rainfall}mm</span>
                    </div>
                  )}
                  {plot.elevation && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mountain className="h-4 w-4 text-gray-500" />
                      <span>{plot.elevation}m</span>
                    </div>
                  )}
                </div>

                {/* Fotos recientes */}
                {recentPhotos.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="h-4 w-4" />
                      <span className="text-sm font-medium">Fotos recientes</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {recentPhotos.slice(0, 3).map((photo) => (
                        <div key={photo.id} className="relative aspect-square">
                          <img
                            src={photo.photo_url}
                            alt={photo.description || `Foto de ${plot.name}`}
                            className="w-full h-full object-cover rounded"
                          />
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {photo.year}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInGoogleMaps(plot.coordinates)}
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver en Google Maps
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!plots || plots.length === 0) && (
        <Card>
          <CardContent className="pt-6 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay parcelas disponibles</h3>
            <p className="text-muted-foreground">
              Las parcelas se mostrarán aquí una vez que sean agregadas por el administrador.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Plots;
