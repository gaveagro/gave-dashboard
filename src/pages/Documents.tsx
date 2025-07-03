import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Calendar, User } from 'lucide-react';

const Documents = () => {
  const { t } = useLanguage();

  // Mock documents data
  const documents = [
    {
      id: 1,
      name: t('language') === 'es' ? 'Contrato de Compraventa - Inversión #001' : 'Purchase Agreement - Investment #001',
      type: 'contract',
      uploadDate: '2024-11-15',
      size: '2.4 MB',
      status: 'active',
      description: t('language') === 'es' ? 'Contrato para la compra de 200 plantas de Espadín' : 'Contract for the purchase of 200 Espadín plants'
    },
    {
      id: 2,
      name: t('language') === 'es' ? 'Reporte Anual 2025 - próximamente' : 'Annual Report 2025 - coming soon',
      type: 'annual_report',
      uploadDate: '2024-12-01',
      size: '8.7 MB',
      status: 'pending',
      description: t('language') === 'es' ? 'Reporte técnico y de mercado para el año 2025' : 'Technical and market report for 2025'
    }
  ];

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('language') === 'es' ? 'Activo' : 'Active';
      case 'pending':
        return t('language') === 'es' ? 'Pendiente' : 'Pending';
      default:
        return t('language') === 'es' ? 'Desconocido' : 'Unknown';
    }
  };

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

      {/* Documents List */}
      <div className="space-y-4">
        {documents.length > 0 ? (
          documents.map((doc) => (
            <Card key={doc.id} className="animate-fade-in border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getDocumentIcon(doc.type)}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{doc.name}</CardTitle>
                      <CardDescription>{doc.description}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(doc.status)}>
                    {getStatusText(doc.status)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('language') === 'es' ? 'Fecha:' : 'Date:'}:</span>
                    <span>{new Date(doc.uploadDate).toLocaleDateString(t('language') === 'es' ? 'es-MX' : 'en-US')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('language') === 'es' ? 'Tamaño:' : 'Size:'}:</span>
                    <span>{doc.size}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('language') === 'es' ? 'Tipo:' : 'Type:'}:</span>
                    <span>{doc.type === 'contract' ? (t('language') === 'es' ? 'Contrato' : 'Contract') : (t('language') === 'es' ? 'Reporte' : 'Report')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    className="bg-gradient-agave hover:opacity-90"
                    disabled={doc.status === 'pending'}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('language') === 'es' ? 'Descargar' : 'Download'}
                  </Button>
                  <Button variant="outline" size="sm">
                    {t('common.view')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="animate-fade-in">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('language') === 'es' ? 'No hay documentos disponibles' : 'No documents available'}</h3>
              <p className="text-muted-foreground">
                {t('language') === 'es' ? 'Los documentos relacionados con tus inversiones aparecerán aquí una vez que sean procesados.' : 'Documents related to your investments will appear here once processed.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Information Card */}
      <Card className="animate-fade-in bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">
            {t('language') === 'es' ? 'Información sobre Documentos' : 'Document Information'}
          </CardTitle>
          <CardDescription>
            {t('language') === 'es' ? 'Todo lo que necesitas saber sobre tus documentos' : 'Everything you need to know about your documents'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">{t('language') === 'es' ? 'Contratos de Compraventa' : 'Purchase Contracts'}</h4>
              <p className="text-muted-foreground">
                {t('language') === 'es' ? 'Documentos legales que formalizan tu inversión en plantas de agave. Se generan automáticamente después de cada compra aprobada.' : 'Legal documents that formalize your agave plant investment. Generated automatically after each approved purchase.'}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t('language') === 'es' ? 'Reportes Anuales' : 'Annual Reports'}</h4>
              <p className="text-muted-foreground">
                {t('language') === 'es' ? 'Informes técnicos y de mercado sobre el estado de las parcelas y las proyecciones de crecimiento de tus plantas.' : 'Technical and market reports on plot status and growth projections for your plants.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Documents;