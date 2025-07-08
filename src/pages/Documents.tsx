import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Calendar, User, Upload, Eye, Plus } from 'lucide-react';

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  document_url: string;
  contract_type?: string;
  file_size?: number;
  created_at: string;
  user_id: string;
  investment_id?: string;
}

const Documents = () => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState("");
  const [documentName, setDocumentName] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', profile?.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "Error",
          description: "El archivo es demasiado grande. Máximo 50MB.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
      setDocumentName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
    }
  };

  const uploadContract = async () => {
    if (!selectedFile || !contractType || !documentName) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive"
      });
      return;
    }

    setUploadingContract(true);
    try {
      // Upload file to storage
      const fileName = `${profile?.user_id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      // Save document record
      const { error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: profile?.user_id,
          document_name: documentName,
          document_type: 'contract',
          document_url: publicUrl,
          contract_type: contractType,
          file_size: selectedFile.size,
          uploaded_by: profile?.user_id
        });

      if (docError) throw docError;

      toast({
        title: "Contrato subido",
        description: "El contrato se ha subido exitosamente"
      });

      // Reset form
      setSelectedFile(null);
      setContractType("");
      setDocumentName("");
      
      // Refresh documents
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading contract:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el contrato",
        variant: "destructive"
      });
    } finally {
      setUploadingContract(false);
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const response = await fetch(doc.document_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = doc.document_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el documento",
        variant: "destructive"
      });
    }
  };

  const getDocumentIcon = (type: string) => {
    return <FileText className="h-5 w-5" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-profit/10 text-profit border-profit/20';
      case 'pending':
        return 'bg-accent/10 text-accent border-accent/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const contractTypes = [
    { value: 'compraventa', label: 'Contrato de Compraventa' },
    { value: 'participacion', label: 'Contrato de Participación' },
    { value: 'mantenimiento', label: 'Contrato de Mantenimiento' },
    { value: 'cosecha', label: 'Contrato de Cosecha' },
    { value: 'otros', label: 'Otros' }
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando documentos...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-agave bg-clip-text text-transparent">
          {t('nav.documents')}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t('language') === 'es' ? 'Documentos relacionados con tus inversiones y contratos' : 'Documents related to your investments and contracts'}
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">Todos los Documentos</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-agave hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Subir Contrato
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Nuevo Contrato</DialogTitle>
                <DialogDescription>
                  Sube documentos relacionados con tus inversiones
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre del Documento</Label>
                  <Input
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Ej: Contrato Inversión Parcela Norte"
                  />
                </div>
                <div>
                  <Label>Tipo de Contrato</Label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Archivo</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {selectedFile ? selectedFile.name : 'Seleccionar archivo'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, PNG - Máximo 50MB
                      </p>
                    </label>
                  </div>
                </div>
                <Button 
                  onClick={uploadContract} 
                  className="w-full" 
                  disabled={uploadingContract || !selectedFile || !contractType || !documentName}
                >
                  {uploadingContract ? 'Subiendo...' : 'Subir Contrato'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="all" className="space-y-4">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <Card key={doc.id} className="animate-fade-in border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getDocumentIcon(doc.document_type)}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{doc.document_name}</CardTitle>
                        <CardDescription>
                          {doc.contract_type && `Tipo: ${contractTypes.find(t => t.value === doc.contract_type)?.label || doc.contract_type}`}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-profit/10 text-profit border-profit/20">
                      Activo
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Fecha:</span>
                      <span>{new Date(doc.created_at).toLocaleDateString('es-MX')}</span>
                    </div>
                    
                    {doc.file_size && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Tamaño:</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>{doc.document_type === 'contract' ? 'Contrato' : 'Reporte'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      className="bg-gradient-agave hover:opacity-90"
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(doc.document_url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="animate-fade-in">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay documentos disponibles</h3>
                <p className="text-muted-foreground">
                  Los documentos relacionados con tus inversiones aparecerán aquí una vez que sean subidos.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          {documents.filter(doc => doc.document_type === 'contract').map((doc) => (
            <Card key={doc.id} className="animate-fade-in border-l-4 border-l-primary">
              {/* Same card content as above */}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {documents.filter(doc => doc.document_type === 'report').map((doc) => (
            <Card key={doc.id} className="animate-fade-in border-l-4 border-l-primary">
              {/* Same card content as above */}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="animate-fade-in bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">Información sobre Contratos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Los contratos se almacenan de forma segura y están disponibles solo para ti y los administradores. 
              Puedes subir documentos relacionados con tus inversiones para tener todo organizado en un solo lugar.
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in bg-gradient-to-r from-secondary/5 to-accent/5 border-secondary/20">
          <CardHeader>
            <CardTitle className="text-secondary">Almacenamiento en Supabase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Límite por archivo:</span>
                <span className="text-sm font-medium">50MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Formatos admitidos:</span>
                <span className="text-sm font-medium">PDF, JPG, PNG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Almacenamiento total:</span>
                <span className="text-sm font-medium">1GB (Plan gratuito)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Documents;