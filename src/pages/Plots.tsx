
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { MapPin, ExternalLink, Camera, Thermometer, Droplets, Mountain, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PhotoModal from '@/components/PhotoModal';

const Plots = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; description?: string; year?: number } | null>(null);

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
        .select('*')
        .eq('status', 'active');
      
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

  const getPlotSpecies = (plotId: string) => {
    const plotInvestments = investments?.filter(inv => inv.plot_id === plotId) || [];
    const speciesIds = [...new Set(plotInvestments.map(inv => inv.species_id))];
    return speciesIds.map(id => plantSpecies?.find(s => s.id === id)?.name).filter(Boolean);
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
                      {plot.status}
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
                    <span className="font-medium">Área:</span>
                    <p>{plot.area} hectáreas</p>
                  </div>
                  <div>
                    <span className="font-medium">Plantas establecidas:</span>
                    <p>{plantsEstablished.toLocaleString()}</p>
                  </div>
                  {plotSpecies.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium">Especies establecidas:</span>
                      <p>{plotSpecies.join(', ')}</p>
                    </div>
                  )}
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

                {/* Admin photo upload */}
                {profile?.role === 'admin' && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm font-medium">Subir foto con dron</span>
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
                      <span className="text-sm font-medium">Fotos recientes</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {recentPhotos.slice(0, 6).map((photo) => (
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
