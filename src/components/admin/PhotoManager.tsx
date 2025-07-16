import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Edit, Upload, Trash2, Eye } from "lucide-react";

export const PhotoManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<any>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  
  const [photoForm, setPhotoForm] = useState({
    plot_id: '',
    description: '',
    year: new Date().getFullYear(),
    photo_file: null as File | null
  });

  // Fetch plots for the select dropdown
  const { data: plots } = useQuery({
    queryKey: ['plots'],
    queryFn: async () => {
      const { data } = await supabase.from('plots').select('*').order('name');
      return data || [];
    }
  });

  // Fetch photos with plot information
  const { data: photos } = useQuery({
    queryKey: ['plot_photos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('plot_photos')
        .select(`
          *,
          plots (name, location)
        `)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoData: any) => {
      let photoUrl = '';
      
      if (photoData.photo_file) {
        const fileExt = photoData.photo_file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('drone-photos')
          .upload(fileName, photoData.photo_file);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('drone-photos')
          .getPublicUrl(fileName);
          
        photoUrl = publicUrl;
      }

      const insertData = {
        plot_id: photoData.plot_id,
        description: photoData.description,
        year: photoData.year,
        photo_url: photoUrl,
        taken_date: new Date().toISOString().split('T')[0]
      };

      if (editingPhoto) {
        // Update existing photo
        const { error } = await supabase
          .from('plot_photos')
          .update({
            description: photoData.description,
            year: photoData.year,
            ...(photoUrl && { photo_url: photoUrl })
          })
          .eq('id', editingPhoto.id);
        
        if (error) throw error;
      } else {
        // Create new photo
        const { error } = await supabase
          .from('plot_photos')
          .insert(insertData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plot_photos'] });
      setShowPhotoDialog(false);
      setEditingPhoto(null);
      setPhotoForm({
        plot_id: '',
        description: '',
        year: new Date().getFullYear(),
        photo_file: null
      });
      toast({
        title: "Éxito",
        description: editingPhoto ? "Foto actualizada correctamente" : "Foto subida correctamente"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase
        .from('plot_photos')
        .delete()
        .eq('id', photoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plot_photos'] });
      toast({
        title: "Éxito",
        description: "Foto eliminada correctamente"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (!photoForm.plot_id) {
      toast({
        title: "Error",
        description: "Selecciona una parcela",
        variant: "destructive"
      });
      return;
    }

    if (!editingPhoto && !photoForm.photo_file) {
      toast({
        title: "Error",
        description: "Selecciona una foto para subir",
        variant: "destructive"
      });
      return;
    }

    uploadPhotoMutation.mutate(photoForm);
  };

  const handleEdit = (photo: any) => {
    setEditingPhoto(photo);
    setPhotoForm({
      plot_id: photo.plot_id,
      description: photo.description || '',
      year: photo.year,
      photo_file: null
    });
    setShowPhotoDialog(true);
  };

  const resetForm = () => {
    setEditingPhoto(null);
    setPhotoForm({
      plot_id: '',
      description: '',
      year: new Date().getFullYear(),
      photo_file: null
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Gestión de Fotos con Dron
              </CardTitle>
              <CardDescription>
                Administra las fotos aéreas de las parcelas y edita sus años
              </CardDescription>
            </div>
            <Dialog open={showPhotoDialog} onOpenChange={(open) => {
              setShowPhotoDialog(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Foto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingPhoto ? 'Editar Foto' : 'Subir Nueva Foto'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPhoto ? 'Modifica los datos de la foto' : 'Sube una nueva foto aérea de la parcela'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Parcela</Label>
                    <Select 
                      value={photoForm.plot_id} 
                      onValueChange={(value) => setPhotoForm(prev => ({ ...prev, plot_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una parcela" />
                      </SelectTrigger>
                      <SelectContent>
                        {plots?.map((plot) => (
                          <SelectItem key={plot.id} value={plot.id}>
                            {plot.name} - {plot.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Año de la Foto</Label>
                    <Input
                      type="number"
                      value={photoForm.year}
                      onChange={(e) => setPhotoForm(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      min="2000"
                      max="2030"
                      placeholder="Ej: 2024"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={photoForm.description}
                      onChange={(e) => setPhotoForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción opcional de la foto..."
                      className="resize-none"
                      rows={3}
                    />
                  </div>

                  {!editingPhoto && (
                    <div className="space-y-2">
                      <Label>Archivo de Foto</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setPhotoForm(prev => ({ ...prev, photo_file: file || null }));
                        }}
                      />
                    </div>
                  )}

                  <Button 
                    onClick={handleSubmit} 
                    disabled={uploadPhotoMutation.isPending}
                    className="w-full"
                  >
                    {uploadPhotoMutation.isPending ? 'Procesando...' : (editingPhoto ? 'Actualizar' : 'Subir Foto')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha Subida</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {photos?.map((photo) => (
                <TableRow key={photo.id}>
                  <TableCell className="font-medium">
                    {photo.plots?.name} - {photo.plots?.location}
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    {photo.year}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {photo.description || 'Sin descripción'}
                  </TableCell>
                  <TableCell>
                    {new Date(photo.created_at).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPhoto(photo);
                          setShowPhotoModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(photo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deletePhotoMutation.mutate(photo.id)}
                        disabled={deletePhotoMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Photo Modal */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPhoto?.plots?.name} - Año {selectedPhoto?.year}
            </DialogTitle>
            <DialogDescription>
              {selectedPhoto?.description || 'Sin descripción'}
            </DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img 
                src={selectedPhoto.photo_url} 
                alt={`Foto de ${selectedPhoto.plots?.name}`}
                className="w-full h-auto max-h-96 object-contain rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Parcela:</strong> {selectedPhoto.plots?.name}
                </div>
                <div>
                  <strong>Ubicación:</strong> {selectedPhoto.plots?.location}
                </div>
                <div>
                  <strong>Año:</strong> {selectedPhoto.year}
                </div>
                <div>
                  <strong>Fecha subida:</strong> {new Date(selectedPhoto.created_at).toLocaleDateString('es-MX')}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};