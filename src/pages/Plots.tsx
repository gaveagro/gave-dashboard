import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Camera, Thermometer, Droplets, Mountain, Upload, Trash2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PhotoModal from '@/components/PhotoModal';
import AgromonitoringMonitor from '@/components/monitoring/AgromonitoringMonitor';
import PlotMap from '@/components/PlotMap';
import ErrorBoundary from '@/components/ErrorBoundary';

const Plots = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { isDemoMode } = useDemo();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; description?: string; year?: number } | null>(null);

  // Optimized query with select only needed fields
  const { data: plots, isLoading } = useQuery({
    queryKey: ['plots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plots')
        .select('id, name, location, status, area, total_plants, latitude, longitude, coordinates, temperature, rainfall, elevation')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000 // Cache for 1 minute
  });

  const { data: plotPhotos } = useQuery({
    queryKey: ['plot-photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plot_photos')
        .select('id, plot_id, photo_url, year, description')
        .order('year', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000
  });

  const { data: investments } = useQuery({
    queryKey: ['investments-plots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investments')
        .select('id, plot_id, species_id, plantation_year, expected_harvest_year')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000
  });

  const { data: plantSpecies } = useQuery({
    queryKey: ['plant-species-plots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_species')
        .select('id, name, maturation_years');
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes - rarely changes
  });

  const deletePlotMutation = useMutation({
    mutationFn: async (plotId: string) => {
      // First delete all photos associated with the plot
      const { data: photos } = await supabase
        .from('plot_photos')
        .select('photo_url')
        .eq('plot_id', plotId);

      if (photos) {
        for (const photo of photos) {
          const fileName = photo.photo_url.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('drone-photos')
              .remove([fileName]);
          }
        }
      }

      // Delete plot photos records
      await supabase
        .from('plot_photos')
        .delete()
        .eq('plot_id', plotId);

      // Delete the plot
      const { error } = await supabase
        .from('plots')
        .delete()
        .eq('id', plotId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Parcela eliminada",
        description: "La parcela y sus fotos han sido eliminadas correctamente."
      });
      queryClient.invalidateQueries({ queryKey: ['plots'] });
      queryClient.invalidateQueries({ queryKey: ['plot-photos'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la parcela.",
        variant: "destructive"
      });
      console.error('Error deleting plot:', error);
    }
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photo: any) => {
      // Delete from storage
      const fileName = photo.photo_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('drone-photos')
          .remove([fileName]);
      }

      // Delete record
      const { error } = await supabase
        .from('plot_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Foto eliminada",
        description: "La foto ha sido eliminada correctamente."
      });
      queryClient.invalidateQueries({ queryKey: ['plot-photos'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la foto.",
        variant: "destructive"
      });
      console.error('Error deleting photo:', error);
    }
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ plotId, file, year, description }: { 
      plotId: string; 
      file: File; 
      year: number; 
      description?: string; 
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${plotId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('drone-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('drone-photos')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('plot_photos')
        .insert({
          plot_id: plotId,
          photo_url: data.publicUrl,
          year,
          description,
          taken_date: new Date().toISOString().split('T')[0]
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast({
        title: "Foto subida",
        description: "La foto ha sido subida correctamente."
      });
      queryClient.invalidateQueries({ queryKey: ['plot-photos'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo subir la foto.",
        variant: "destructive"
      });
      console.error('Error uploading photo:', error);
    }
  });

  const handlePhotoUpload = async (plotId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const year = new Date().getFullYear();
    uploadPhotoMutation.mutate({ plotId, file, year });
  };

  const openInGoogleMaps = (coordinates: string) => {
    if (profile?.role === 'demo') {
      toast({
        title: "Función no disponible en el demo",
        description: "La ubicación exacta de las parcelas no se muestra en el modo demo por seguridad",
        variant: "destructive"
      });
      return;
    }
    
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
    // Get from plot data instead of counting investments
    const plot = plots?.find(p => p.id === plotId);
    return plot?.total_plants || 0;
  };

  const getPlotSpecies = (plotId: string) => {
    const plotInvestments = investments?.filter(inv => inv.plot_id === plotId) || [];
    const speciesIds = [...new Set(plotInvestments.map(inv => inv.species_id))];
    return speciesIds.map(id => plantSpecies?.find(s => s.id === id)?.name).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-4 md:py-6 px-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">Parcelas</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Cargando información...
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">{t('plots.title')}</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {t('plots.description')}
        </p>
      </div>

      {/* Single column layout for better mobile experience and map prominence */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {plots?.map((plot) => {
          const recentPhotos = plotPhotos?.filter(photo => photo.plot_id === plot.id) || [];
          const plotProgress = getPlotProgress(plot.id);
          const nextHarvest = getNextHarvest(plot.id);
          const plantsEstablished = getPlantsEstablished(plot.id);
          const plotSpecies = getPlotSpecies(plot.id);
          
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
                  <div className="flex items-center gap-2">
                    <Badge variant={plot.status === 'Activa' ? 'default' : 'secondary'}>
                      {plot.status === 'Activa' ? t('plots.active') : plot.status}
                    </Badge>
                    {profile?.role === 'admin' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePlotMutation.mutate(plot.id)}
                        disabled={deletePlotMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Información básica */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">{t('plots.area')}:</span>
                    <p>{plot.area} {t('plots.hectares')}</p>
                  </div>
                  <div>
                    <span className="font-medium">{t('plots.plantsEstablished')}:</span>
                    <p>{plantsEstablished.toLocaleString()}</p>
                  </div>
                  {plotSpecies.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium">{t('plots.speciesEstablished')}:</span>
                      <p>{plotSpecies.join(', ')}</p>
                    </div>
                  )}
                </div>

                {/* Progreso hacia la madurez */}
                {plotProgress > 0 && (
                  <div className="space-y-2 pt-3 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{t('plots.harvestProgress')}</span>
                      <span>{plotProgress}%</span>
                    </div>
                    <Progress value={plotProgress} className="h-2" />
                    {nextHarvest && (
                      <p className="text-xs text-muted-foreground">
                        {t('plots.nextHarvestEstimate')}: {nextHarvest}
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

                {/* Mapa de ubicación - Increased prominence */}
                {plot.latitude && plot.longitude && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{t('plots.plotLocation')}</span>
                    </div>
                    <div className="mb-4">
                      <PlotMap
                        latitude={plot.latitude}
                        longitude={plot.longitude}
                        name={plot.name}
                        plotId={plot.id}
                      />
                    </div>
                  </div>
                )}

                {/* Agromonitoring Satellite Monitoring */}
                <div className="pt-4 border-t">
                  <ErrorBoundary
                    fallback={
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm text-muted-foreground">{t('monitoring.demo')}</p>
                        </CardContent>
                      </Card>
                    }
                  >
                    <AgromonitoringMonitor plotId={plot.id} plotName={plot.name} />
                  </ErrorBoundary>
                </div>

                {/* Admin photo upload */}
                {profile?.role === 'admin' && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">{t('plots.uploadDronePhoto')}</span>
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(plot.id, e)}
                      disabled={uploadPhotoMutation.isPending}
                    />
                  </div>
                )}

                {/* Fotos recientes */}
                {recentPhotos.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Camera className="h-4 w-4" />
                      <span className="text-sm font-medium">{t('plots.recentPhotos')}</span>
                    </div>
                    {/* Mobile: 2 columns, Desktop: 4 columns for more compact layout */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {recentPhotos.slice(0, 4).map((photo) => (
                        <div key={photo.id} className="relative aspect-square group">
                          <img
                            src={photo.photo_url}
                            alt={photo.description || `Foto de ${plot.name}`}
                            className="w-full h-full object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedPhoto({
                              url: photo.photo_url,
                              description: photo.description,
                              year: photo.year
                            })}
                          />
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {photo.year}
                          </div>
                          {profile?.role === 'admin' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePhotoMutation.mutate(photo);
                              }}
                              disabled={deletePhotoMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
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
                    disabled={profile?.role === 'demo'}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {profile?.role === 'demo' ? t('plots.protectedLocation') : t('plots.viewOnGoogleMaps')}
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

      {/* Photo Modal */}
      <PhotoModal
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        photoUrl={selectedPhoto?.url || ''}
        description={selectedPhoto?.description}
        year={selectedPhoto?.year}
      />
    </div>
  );
};

export default Plots;
