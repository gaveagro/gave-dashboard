import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Thermometer, Droplets, Wind } from 'lucide-react';

interface AlertsPanelProps {
  aoiId?: string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ aoiId }) => {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['cecil-alerts', aoiId],
    queryFn: async () => {
      if (!aoiId) {
        // Return demo alerts for mockup
        return generateDemoAlerts();
      }

      const { data, error } = await supabase
        .from('cecil_alerts')
        .select('*')
        .eq('cecil_aoi_id', aoiId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || generateDemoAlerts();
    },
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  const generateDemoAlerts = () => {
    const alertTypes = [
      {
        type: 'temperature_high',
        title: 'Temperatura Alta Detectada',
        description: 'La temperatura ha superado los 35°C en Parcela El Sabinal',
        severity: 'high',
        threshold_value: 35,
        current_value: 37.2,
        icon: Thermometer,
        color: 'text-red-500',
        recommendation: 'Considerar riego adicional para proteger las plantas del estrés térmico'
      },
      {
        type: 'soil_moisture_low',
        title: 'Humedad del Suelo Baja',
        description: 'Los niveles de humedad del suelo están por debajo del umbral recomendado',
        severity: 'medium',
        threshold_value: 30,
        current_value: 22.8,
        icon: Droplets,
        color: 'text-yellow-500',
        recommendation: 'Programar riego en las próximas 24 horas'
      },
      {
        type: 'wind_high',
        title: 'Vientos Fuertes',
        description: 'Se detectaron vientos superiores a 40 km/h que podrían afectar las plantas jóvenes',
        severity: 'medium',
        threshold_value: 40,
        current_value: 45.3,
        icon: Wind,
        color: 'text-orange-500',
        recommendation: 'Revisar sistemas de soporte para plantas jóvenes'
      }
    ];

    return alertTypes.map((alert, index) => ({
      id: `demo-alert-${index}`,
      alert_type: alert.type,
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      threshold_value: alert.threshold_value,
      current_value: alert.current_value,
      recommendation: alert.recommendation,
      status: 'active',
      created_at: new Date(Date.now() - index * 2 * 60 * 60 * 1000).toISOString(), // Stagger by 2 hours
      acknowledged_at: null,
      acknowledged_by: null,
      resolved_at: null
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (alertType: string) => {
    if (alertType.includes('temperature')) return Thermometer;
    if (alertType.includes('moisture') || alertType.includes('humidity')) return Droplets;
    if (alertType.includes('wind')) return Wind;
    return AlertTriangle;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alertas de Monitoreo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Sin Alertas Activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todas las métricas están dentro de los rangos normales.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged_at && !alert.resolved_at);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Alertas de Monitoreo
            {activeAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {activeAlerts.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.slice(0, 5).map((alert) => {
            const AlertIcon = getAlertIcon(alert.alert_type);
            const isActive = alert.status === 'active';
            const isAcknowledged = alert.acknowledged_at && !alert.resolved_at;

            return (
              <div key={alert.id} className={`p-3 rounded-lg border ${
                isActive ? 'border-orange-200 bg-orange-50' : 
                isAcknowledged ? 'border-blue-200 bg-blue-50' : 
                'border-green-200 bg-green-50'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertIcon className={`h-5 w-5 mt-0.5 ${
                    isActive ? 'text-orange-500' : 
                    isAcknowledged ? 'text-blue-500' : 
                    'text-green-500'
                  }`} />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                          {alert.severity === 'high' ? 'Alta' : 
                           alert.severity === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                        {isActive && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Activa
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    
                    {alert.threshold_value && alert.current_value && (
                      <div className="text-xs text-muted-foreground">
                        Umbral: {alert.threshold_value} | Actual: <span className="font-medium">{alert.current_value}</span>
                      </div>
                    )}
                    
                    {alert.recommendation && (
                      <div className="text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-200">
                        <strong>Recomendación:</strong> {alert.recommendation}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {new Date(alert.created_at).toLocaleString('es-ES')}
                      </span>
                      {isActive && (
                        <Button variant="outline" size="sm" className="h-6 text-xs">
                          Reconocer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {alerts.length > 5 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              Ver todas las alertas ({alerts.length})
            </Button>
          </div>
        )}

        {/* Alert summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-red-500">{activeAlerts.length}</div>
              <div className="text-xs text-muted-foreground">Activas</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-500">{acknowledgedAlerts.length}</div>
              <div className="text-xs text-muted-foreground">Reconocidas</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-500">
                {alerts.filter(a => a.resolved_at).length}
              </div>
              <div className="text-xs text-muted-foreground">Resueltas</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;