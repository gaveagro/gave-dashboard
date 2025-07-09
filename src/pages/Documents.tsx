
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye,
  AlertCircle
} from 'lucide-react';

const Documents = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [contractType, setContractType] = useState('');

  const isAdmin = profile?.role === 'admin';

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase.from('documents').select('*');
      
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const handleFileUpload = async () => {
    if (!selectedFile || !documentType || !documentName || !user) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Usar el bucket contracts para todos los documentos
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          document_name: documentName,
          document_type: documentType,
          contract_type: documentType === 'contract' ? contractType : null,
          document_url: publicUrl,
          file_size: selectedFile.size,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Éxito",
        description: "Documento subido correctamente"
      });

      // Reset form
      setSelectedFile(null);
      setDocumentType('');
      setDocumentName('');
      setContractType('');
      
      // Refresh documents
      queryClient.invalidateQueries({ queryKey: ['documents'] });

    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: error.message || "Error al subir el archivo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, documentUrl: string) => {
    if (!isAdmin) {
      toast({
        title: "Error",
        description: "Solo los administradores pueden eliminar documentos",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return;

    try {
      // Extract file path from URL
      const urlParts = documentUrl.split('/');
      const filePath = urlParts.slice(-2).join('/'); // Get last two parts (user_id/filename)

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('contracts')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast({
        title: "Éxito",
        description: "Documento eliminado correctamente"
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });

    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el documento",
        variant: "destructive"
      });
    }
  };

  const downloadDocument = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <p>Cargando documentos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Documentos</h1>
        <p className="text-muted-foreground">
          Gestiona tus documentos y contratos de inversión
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Documento
          </CardTitle>
          <CardDescription>
            Sube contratos, identificaciones y otros documentos importantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="file">Archivo</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre del documento</Label>
              <Input
                id="name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Ej: Contrato de Inversión"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contrato</SelectItem>
                  <SelectItem value="identification">Identificación</SelectItem>
                  <SelectItem value="tax-id">RFC/Identificación Fiscal</SelectItem>
                  <SelectItem value="payment-proof">Comprobante de Pago</SelectItem>
                  {isAdmin && <SelectItem value="report">Reporte</SelectItem>}
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {documentType === 'contract' && (
              <div className="space-y-2">
                <Label htmlFor="contract-type">Tipo de Contrato</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investment">Contrato de Inversión</SelectItem>
                    <SelectItem value="partnership">Contrato de Sociedad</SelectItem>
                    <SelectItem value="service">Contrato de Servicios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button onClick={handleFileUpload} disabled={uploading || !selectedFile}>
            {uploading ? 'Subiendo...' : 'Subir Documento'}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mis Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <h4 className="font-medium">{doc.document_name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <Badge variant="outline">{doc.document_type}</Badge>
                          {doc.contract_type && (
                            <Badge variant="secondary">{doc.contract_type}</Badge>
                          )}
                          {doc.file_size && (
                            <span>{formatFileSize(doc.file_size)}</span>
                          )}
                          <span>{new Date(doc.created_at).toLocaleDateString('es-MX')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.document_url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDocument(doc.document_url, doc.document_name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id, doc.document_url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
              <p className="text-muted-foreground">
                Sube tu primer documento usando el formulario de arriba.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Documents;
