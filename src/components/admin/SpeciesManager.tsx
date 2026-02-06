
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type PlantSpecies = Tables<'plant_species'>;
type PlantPrice = Tables<'plant_prices'>;

interface PriceWithYear extends PlantPrice {
  isEditing?: boolean;
}

export function SpeciesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState<PlantSpecies | null>(null);
  const [editingPrices, setEditingPrices] = useState<{ [key: string]: PriceWithYear }>({});
  const [newPriceData, setNewPriceData] = useState<{ [key: string]: { year: string; price: string } }>({});
  const [newSpeciesData, setNewSpeciesData] = useState({
    name: '',
    scientific_name: '',
    description: '',
    maturation_years: 6,
    min_weight_kg: 50,
    max_weight_kg: 100,
    carbon_capture_per_plant: 0.072
  });

  // Fetch species and prices
  const { data: species } = useQuery({
    queryKey: ['plant-species'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_species')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: prices } = useQuery({
    queryKey: ['plant-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_prices')
        .select('*')
        .order('year', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create species mutation
  const createSpeciesMutation = useMutation({
    mutationFn: async (speciesData: typeof newSpeciesData) => {
      const { data, error } = await supabase
        .from('plant_species')
        .insert([speciesData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-species'] });
      setIsCreateDialogOpen(false);
      setNewSpeciesData({
        name: '',
        scientific_name: '',
        description: '',
        maturation_years: 6,
        min_weight_kg: 50,
        max_weight_kg: 100,
        carbon_capture_per_plant: 0.072
      });
      toast({
        title: "Especie creada",
        description: "La especie ha sido creada exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la especie",
        variant: "destructive",
      });
    },
  });

  // Update species mutation
  const updateSpeciesMutation = useMutation({
    mutationFn: async (speciesData: PlantSpecies) => {
      const { data, error } = await supabase
        .from('plant_species')
        .update(speciesData)
        .eq('id', speciesData.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-species'] });
      setEditingSpecies(null);
      toast({
        title: "Especie actualizada",
        description: "La especie ha sido actualizada exitosamente",
      });
    },
  });

  // Create price mutation
  const createPriceMutation = useMutation({
    mutationFn: async ({ species_id, year, price }: { species_id: string; year: number; price: number }) => {
      const { data, error } = await supabase
        .from('plant_prices')
        .insert([{ species_id, year, price_per_plant: price }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-prices'] });
      toast({
        title: "Precio agregado",
        description: "El precio ha sido agregado exitosamente",
      });
    },
  });

  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: async (priceData: PlantPrice) => {
      const { data, error } = await supabase
        .from('plant_prices')
        .update({ price_per_plant: priceData.price_per_plant, year: priceData.year })
        .eq('id', priceData.id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-prices'] });
      setEditingPrices({});
      toast({
        title: "Precio actualizado",
        description: "El precio ha sido actualizado exitosamente",
      });
    },
  });

  // Delete price mutation
  const deletePriceMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const { error } = await supabase
        .from('plant_prices')
        .delete()
        .eq('id', priceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-prices'] });
      toast({
        title: "Precio eliminado",
        description: "El precio ha sido eliminado exitosamente",
      });
    },
  });

  const getSpeciesPrices = (speciesId: string): PriceWithYear[] => {
    if (!prices) return [];
    return prices
      .filter(price => price.species_id === speciesId)
      .map(price => ({
        ...price,
        isEditing: editingPrices[price.id] ? true : false
      }));
  };

  const handleCreateSpecies = () => {
    createSpeciesMutation.mutate(newSpeciesData);
  };

  const handleUpdateSpecies = () => {
    if (editingSpecies) {
      updateSpeciesMutation.mutate(editingSpecies);
    }
  };

  const startEditingPrice = (price: PlantPrice) => {
    setEditingPrices({
      ...editingPrices,
      [price.id]: { ...price, isEditing: true }
    });
  };

  const saveEditingPrice = (priceId: string) => {
    const price = editingPrices[priceId];
    if (price) {
      updatePriceMutation.mutate(price);
    }
  };

  const cancelEditingPrice = (priceId: string) => {
    const newEditingPrices = { ...editingPrices };
    delete newEditingPrices[priceId];
    setEditingPrices(newEditingPrices);
  };

  const handleAddNewPrice = (speciesId: string) => {
    const currentYear = new Date().getFullYear();
    const priceData = newPriceData[speciesId];
    
    if (priceData && priceData.year && priceData.price) {
      const year = parseInt(priceData.year);
      const price = parseFloat(priceData.price);
      
      if (!isNaN(year) && !isNaN(price)) {
        createPriceMutation.mutate({
          species_id: speciesId,
          year: year,
          price: price
        });
        
        // Clear the form
        setNewPriceData({
          ...newPriceData,
          [speciesId]: { year: '', price: '' }
        });
      }
    } else {
      // Use default values if no input
      createPriceMutation.mutate({
        species_id: speciesId,
        year: currentYear,
        price: 250
      });
    }
  };

  const updateNewPriceData = (speciesId: string, field: 'year' | 'price', value: string) => {
    setNewPriceData({
      ...newPriceData,
      [speciesId]: {
        ...newPriceData[speciesId],
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Especies</h2>
          <p className="text-muted-foreground">Administra las especies y sus precios por año</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Especie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Nueva Especie</DialogTitle>
              <DialogDescription>
                Agrega una nueva especie de planta al sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newSpeciesData.name}
                  onChange={(e) => setNewSpeciesData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Agave Angustifolia"
                />
              </div>
              <div>
                <Label htmlFor="scientific_name">Nombre Científico</Label>
                <Input
                  id="scientific_name"
                  value={newSpeciesData.scientific_name}
                  onChange={(e) => setNewSpeciesData(prev => ({ ...prev, scientific_name: e.target.value }))}
                  placeholder="Ej: Agave angustifolia"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newSpeciesData.description}
                  onChange={(e) => setNewSpeciesData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción de la especie..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maturation_years">Años de Maduración</Label>
                  <Input
                    id="maturation_years"
                    type="number"
                    step="0.5"
                    value={newSpeciesData.maturation_years}
                    onChange={(e) => setNewSpeciesData(prev => ({ ...prev, maturation_years: parseFloat(e.target.value) || 5.5 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="carbon_capture">Captura CO₂ (t/planta)</Label>
                  <Input
                    id="carbon_capture"
                    type="number"
                    step="0.001"
                    value={newSpeciesData.carbon_capture_per_plant}
                    onChange={(e) => setNewSpeciesData(prev => ({ ...prev, carbon_capture_per_plant: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_weight">Peso Mín (kg)</Label>
                  <Input
                    id="min_weight"
                    type="number"
                    value={newSpeciesData.min_weight_kg}
                    onChange={(e) => setNewSpeciesData(prev => ({ ...prev, min_weight_kg: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="max_weight">Peso Máx (kg)</Label>
                  <Input
                    id="max_weight"
                    type="number"
                    value={newSpeciesData.max_weight_kg}
                    onChange={(e) => setNewSpeciesData(prev => ({ ...prev, max_weight_kg: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSpecies} disabled={createSpeciesMutation.isPending}>
                  {createSpeciesMutation.isPending ? 'Creando...' : 'Crear Especie'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {species?.map((specie) => (
          <Card key={specie.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {editingSpecies?.id === specie.id ? (
                      <Input
                        value={editingSpecies.name}
                        onChange={(e) => setEditingSpecies(prev => prev ? { ...prev, name: e.target.value } : null)}
                        className="text-lg font-semibold"
                      />
                    ) : (
                      specie.name
                    )}
                    {editingSpecies?.id === specie.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          value={editingSpecies.maturation_years}
                          onChange={(e) => setEditingSpecies(prev => prev ? { ...prev, maturation_years: parseFloat(e.target.value) || 5.5 } : null)}
                          className="w-20 text-center"
                        />
                        <span className="text-sm">años</span>
                      </div>
                    ) : (
                      <Badge variant="secondary">{specie.maturation_years} años</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {editingSpecies?.id === specie.id ? (
                      <Input
                        value={editingSpecies.scientific_name || ''}
                        onChange={(e) => setEditingSpecies(prev => prev ? { ...prev, scientific_name: e.target.value } : null)}
                        placeholder="Nombre científico"
                      />
                    ) : (
                      specie.scientific_name
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {editingSpecies?.id === specie.id ? (
                    <>
                      <Button size="sm" onClick={handleUpdateSpecies}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingSpecies(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditingSpecies(specie)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingSpecies?.id === specie.id && (
                <div className="space-y-4 mb-6">
                  <Textarea
                    value={editingSpecies.description || ''}
                    onChange={(e) => setEditingSpecies(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Descripción de la especie"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Peso Mín (kg)</Label>
                      <Input
                        type="number"
                        value={editingSpecies.min_weight_kg}
                        onChange={(e) => setEditingSpecies(prev => prev ? { ...prev, min_weight_kg: parseInt(e.target.value) } : null)}
                      />
                    </div>
                    <div>
                      <Label>Peso Máx (kg)</Label>
                      <Input
                        type="number"
                        value={editingSpecies.max_weight_kg}
                        onChange={(e) => setEditingSpecies(prev => prev ? { ...prev, max_weight_kg: parseInt(e.target.value) } : null)}
                      />
                    </div>
                    <div>
                      <Label>CO₂ (t/planta)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={editingSpecies.carbon_capture_per_plant || 0.072}
                        onChange={(e) => setEditingSpecies(prev => prev ? { ...prev, carbon_capture_per_plant: parseFloat(e.target.value) } : null)}
                      />
                    </div>
                  </div>
                  <Separator />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Precios por Año de Establecimiento</h4>
                </div>
                
                {/* Form para agregar nuevo precio */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor={`year-${specie.id}`}>Año</Label>
                    <Input
                      id={`year-${specie.id}`}
                      type="number"
                      placeholder="2025"
                      value={newPriceData[specie.id]?.year || ''}
                      onChange={(e) => updateNewPriceData(specie.id, 'year', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`price-${specie.id}`}>Precio por Planta</Label>
                    <Input
                      id={`price-${specie.id}`}
                      type="number"
                      placeholder="250"
                      value={newPriceData[specie.id]?.price || ''}
                      onChange={(e) => updateNewPriceData(specie.id, 'price', e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => handleAddNewPrice(specie.id)} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Precio
                    </Button>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Año</TableHead>
                      <TableHead>Precio por Planta</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSpeciesPrices(specie.id).map((price) => (
                      <TableRow key={price.id}>
                        <TableCell>
                          {editingPrices[price.id] ? (
                            <Input
                              type="number"
                              value={editingPrices[price.id].year}
                              onChange={(e) => setEditingPrices(prev => ({
                                ...prev,
                                [price.id]: { ...prev[price.id], year: parseInt(e.target.value) }
                              }))}
                            />
                          ) : (
                            price.year
                          )}
                        </TableCell>
                        <TableCell>
                          {editingPrices[price.id] ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingPrices[price.id].price_per_plant}
                              onChange={(e) => setEditingPrices(prev => ({
                                ...prev,
                                [price.id]: { ...prev[price.id], price_per_plant: parseFloat(e.target.value) }
                              }))}
                            />
                          ) : (
                            `$${price.price_per_plant.toLocaleString()}`
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingPrices[price.id] ? (
                              <>
                                <Button size="sm" onClick={() => saveEditingPrice(price.id)}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => cancelEditingPrice(price.id)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => startEditingPrice(price)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deletePriceMutation.mutate(price.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {getSpeciesPrices(specie.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No hay precios configurados para esta especie
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
