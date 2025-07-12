
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Calendar } from 'lucide-react';
import { Badge } from "@/components/ui/badge"

const Reports = () => {
  const { t } = useLanguage();
  // Fetch reports (documents with type 'report')
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('document_type', 'report')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleDownload = (documentUrl: string, documentName: string) => {
    // Simply open the file in a new tab for viewing
    window.open(documentUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Cargando reportes...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.title')}</h1>
        <p className="text-muted-foreground">
          {t('reports.description')}
        </p>
      </div>

      <div className="grid gap-6">
        {reports && reports.length > 0 ? (
          reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{report.document_name}</CardTitle>
                      <CardDescription className="flex items-center space-x-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>Subido el {new Date(report.created_at).toLocaleDateString('es-MX')}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      {report.contract_type || 'Reporte'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(report.document_url, report.document_name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Ver/Descargar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {report.file_size && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tamaño: {(report.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay reportes disponibles</h3>
              <p className="text-muted-foreground">
                Los reportes anuales aparecerán aquí cuando estén disponibles.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Reports;
