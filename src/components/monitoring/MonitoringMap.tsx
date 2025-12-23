import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface MonitoringMapProps {
  plots?: any[];
}

const MonitoringMap: React.FC<MonitoringMapProps> = ({ plots = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            🌍 {t('monitoring.plotsOverview')}
          </CardTitle>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            {plots?.length || 0} {t('nav.plots')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div 
          ref={mapContainer} 
          className="w-full h-[300px] bg-gradient-to-br from-green-100 via-blue-50 to-green-50 rounded-lg relative overflow-hidden"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 w-24 h-24 bg-green-400 rounded-full blur-xl"></div>
            <div className="absolute top-16 right-16 w-20 h-20 bg-blue-400 rounded-full blur-xl"></div>
            <div className="absolute bottom-16 left-16 w-16 h-16 bg-yellow-400 rounded-full blur-xl"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg max-w-sm">
              <div className="text-2xl mb-2">🗺️</div>
              <div className="text-lg font-bold mb-1 text-gray-800">{t('monitoring.plotsOverview')}</div>
              <div className="text-sm text-gray-600">
                {t('monitoring.integratedDescription')}
              </div>
            </div>
          </div>
          
          {/* Mock parcel markers */}
          {plots?.slice(0, 5).map((_, i) => (
            <div 
              key={i}
              className="absolute w-3 h-3 bg-green-600 rounded-full border-2 border-white shadow-lg"
              style={{
                top: `${20 + (i * 15) % 60}%`,
                left: `${25 + (i * 20) % 50}%`
              }}
            ></div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitoringMap;
