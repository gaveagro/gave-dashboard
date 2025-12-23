import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Droplets, Eye, TrendingUp } from 'lucide-react';
import { AgromonitoringData } from '@/lib/agromonitoring';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

interface AgromonitoringIndicatorsProps {
  polygonId: string;
  satelliteData: AgromonitoringData | null;
  isLoading: boolean;
}

const AgromonitoringIndicators: React.FC<AgromonitoringIndicatorsProps> = ({
  polygonId,
  satelliteData,
  isLoading
}) => {
  const { t } = useLanguage();

  const getNdviColor = (value: number) => {
    if (value >= 0.6) return 'text-green-600';
    if (value >= 0.3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getNdviBadgeColor = (value: number) => {
    if (value >= 0.6) return 'bg-green-100 text-green-800 border-green-200';
    if (value >= 0.3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getNdviStatus = (value: number) => {
    if (value >= 0.6) return t('monitoring.denseVegetation');
    if (value >= 0.4) return t('monitoring.moderateVegetation');
    if (value >= 0.2) return t('monitoring.sparseVegetation');
    return t('monitoring.noVegetation');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('monitoring.vegetationIndices')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate demo data if no real data
  const demoData = !satelliteData ? {
    ndvi_mean: 0.65 + (Math.random() - 0.5) * 0.2,
    ndvi_min: 0.45,
    ndvi_max: 0.82,
    evi_mean: 0.55 + (Math.random() - 0.5) * 0.15,
    ndwi_mean: -0.15 + (Math.random() - 0.5) * 0.1,
    cloud_coverage: Math.random() * 30,
    measurement_date: new Date().toISOString().split('T')[0],
    satellite_image_url: null
  } : null;

  const data = satelliteData || demoData;
  const isDemo = !satelliteData;

  const indicators = [
    {
      name: t('monitoring.ndvi'),
      description: t('monitoring.ndviDescription'),
      value: data?.ndvi_mean,
      min: data?.ndvi_min,
      max: data?.ndvi_max,
      icon: Leaf,
      formatter: (v: number) => v?.toFixed(3) || 'N/A',
      colorFn: getNdviColor,
      badgeColorFn: getNdviBadgeColor,
      statusFn: getNdviStatus
    },
    {
      name: t('monitoring.evi'),
      description: t('monitoring.eviDescription'),
      value: data?.evi_mean,
      icon: TrendingUp,
      formatter: (v: number) => v?.toFixed(3) || 'N/A',
      colorFn: getNdviColor,
      badgeColorFn: getNdviBadgeColor
    },
    {
      name: t('monitoring.ndwi'),
      description: t('monitoring.ndwiDescription'),
      value: data?.ndwi_mean,
      icon: Droplets,
      formatter: (v: number) => v?.toFixed(3) || 'N/A',
      colorFn: (v: number) => v > 0 ? 'text-blue-600' : 'text-orange-600',
      badgeColorFn: (v: number) => v > 0 ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      name: t('monitoring.clouds'),
      description: t('monitoring.cloudsDescription'),
      value: data?.cloud_coverage,
      icon: Eye,
      formatter: (v: number) => `${v?.toFixed(0) || 0}%`,
      colorFn: (v: number) => v < 20 ? 'text-green-600' : v < 50 ? 'text-yellow-600' : 'text-gray-600',
      badgeColorFn: (v: number) => v < 20 ? 'bg-green-100 text-green-800 border-green-200' : v < 50 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 text-gray-800 border-gray-200'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{t('monitoring.vegetationIndices')}</CardTitle>
          <div className="flex items-center gap-2">
            {isDemo && (
              <Badge variant="secondary" className="text-xs">
                {t('monitoring.demo')}
              </Badge>
            )}
            {data?.measurement_date && (
              <span className="text-xs text-muted-foreground">
                {new Date(data.measurement_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {indicators.map((indicator) => {
            const IconComponent = indicator.icon;
            const value = indicator.value;
            
            return (
              <div key={indicator.name} className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconComponent className={`h-4 w-4 ${indicator.colorFn(value || 0)}`} />
                  <span className="text-sm font-medium">{indicator.name}</span>
                </div>
                <div className="space-y-1">
                  <Badge 
                    variant="outline" 
                    className={`${indicator.badgeColorFn(value || 0)} text-sm`}
                  >
                    {indicator.formatter(value || 0)}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {indicator.description}
                  </p>
                  {indicator.statusFn && value !== null && (
                    <p className={`text-xs ${indicator.colorFn(value || 0)}`}>
                      {indicator.statusFn(value || 0)}
                    </p>
                  )}
                  {indicator.min !== undefined && indicator.max !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Min: {indicator.min?.toFixed(2)} / Max: {indicator.max?.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* NDVI Legend */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium mb-2">{t('monitoring.ndviInterpretation')}:</p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span><span className="text-green-600">●</span> {t('monitoring.ndviDense')}</span>
            <span><span className="text-yellow-600">●</span> {t('monitoring.ndviModerate')}</span>
            <span><span className="text-red-600">●</span> {t('monitoring.ndviSparse')}</span>
          </div>
        </div>

        {/* Satellite Image Preview */}
        {data?.satellite_image_url && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium mb-2">{t('monitoring.satelliteImage')}:</p>
            <img 
              src={data.satellite_image_url} 
              alt="NDVI Satellite Image"
              className="w-full h-32 object-cover rounded-lg"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgromonitoringIndicators;
