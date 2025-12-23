import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MonitoringMapProps {
  plots?: any[];
}

const MonitoringMap: React.FC<MonitoringMapProps> = ({ plots = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            🌍 Vista General de Parcelas
          </CardTitle>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            {plots?.length || 0} Parcelas
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
              <div className="text-lg font-bold mb-1 text-gray-800">Mapa de Parcelas</div>
              <div className="text-sm text-gray-600">
                Visualización integrada de todas las parcelas monitoreadas
              </div>
              
              {/* Demo indicators */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-center items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Activas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Monitoreadas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mock parcel markers */}
          <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-green-600 rounded-full border-2 border-white shadow-lg"></div>
          <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-green-600 rounded-full border-2 border-white shadow-lg"></div>
          <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-green-600 rounded-full border-2 border-white shadow-lg"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonitoringMap;
