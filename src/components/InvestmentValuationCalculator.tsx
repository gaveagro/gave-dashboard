import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp, Minus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface InvestmentValuationCalculatorProps {
  investment: {
    id: string;
    plant_count: number;
    price_per_plant: number;
    total_amount: number;
    plant_species?: {
      name: string;
      min_weight_kg: number;
      max_weight_kg: number;
    };
  };
}

export const InvestmentValuationCalculator = ({ investment }: InvestmentValuationCalculatorProps) => {
  const { t } = useLanguage();
  // Estados para los parámetros ajustables
  const [pricePerKg, setPricePerKg] = useState([20]); // Rango base MXN por kg
  const [weightPerPlant, setWeightPerPlant] = useState([
    Math.floor((investment.plant_species?.min_weight_kg || 40) + 
    ((investment.plant_species?.max_weight_kg || 80) - (investment.plant_species?.min_weight_kg || 40)) / 2)
  ]);
  
  // Constantes de Gavé
  const GAVE_COMMISSION = 0.15; // 15% comisión
  
  // Cálculos
  const totalWeightKg = weightPerPlant[0] * investment.plant_count;
  const grossRevenue = totalWeightKg * pricePerKg[0];
  const gaveCommission = grossRevenue * GAVE_COMMISSION;
  const netRevenue = grossRevenue - gaveCommission;
  const totalProfit = netRevenue - investment.total_amount;
  const roi = (totalProfit / investment.total_amount) * 100;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  return (
    <Card className="mt-4 border-l-4 border-l-profit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-profit" />
          {t('investments.valuationCalculator')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Parámetros de Entrada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Precio por kg */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t('investments.estimatedPricePerKg')} {formatCurrency(pricePerKg[0])} MXN
            </Label>
            <Slider
              value={pricePerKg}
              onValueChange={setPricePerKg}
              min={0}
              max={40}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>$0 MXN/kg</span>
              <span>$40 MXN/kg</span>
            </div>
          </div>

          {/* Peso por planta */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {t('investments.weightPerPlant')} {formatNumber(weightPerPlant[0])} kg
            </Label>
            <Slider
              value={weightPerPlant}
              onValueChange={setWeightPerPlant}
              min={investment.plant_species?.min_weight_kg || 40}
              max={investment.plant_species?.max_weight_kg || 80}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{investment.plant_species?.min_weight_kg || 40} kg</span>
              <span>{investment.plant_species?.max_weight_kg || 80} kg</span>
            </div>
          </div>
        </div>

        {/* Datos Fijos */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <h4 className="font-medium mb-3 text-sm">{t('investments.yourInvestmentData')}</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">{t('investments.plants')}</div>
              <div className="font-medium">{formatNumber(investment.plant_count)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('investments.pricePaidPerPlant')}</div>
              <div className="font-medium">{formatCurrency(investment.price_per_plant)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('investments.totalInvestment')}</div>
              <div className="font-medium">{formatCurrency(investment.total_amount)}</div>
            </div>
          </div>
        </div>

        {/* Resultados de la Calculadora */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">{t('investments.valuationProjection')}</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Columna de Ingresos */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-muted">
                <span className="text-sm text-muted-foreground">{t('investments.totalEstimatedWeight')}</span>
                <span className="font-medium">{formatNumber(totalWeightKg)} kg</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-muted">
                <span className="text-sm text-muted-foreground">{t('investments.grossRevenue')}</span>
                <span className="font-medium text-profit">{formatCurrency(grossRevenue)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-muted">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Minus className="h-3 w-3" />
                  {t('investments.gaveCommission')}
                </span>
                <span className="font-medium text-destructive">-{formatCurrency(gaveCommission)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b-2 border-primary">
                <span className="text-sm font-medium">{t('investments.netRevenue')}</span>
                <span className="font-bold text-profit">{formatCurrency(netRevenue)}</span>
              </div>
            </div>

            {/* Columna de ROI */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-muted">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Minus className="h-3 w-3" />
                  {t('investments.initialInvestment')}
                </span>
                <span className="font-medium text-investment">-{formatCurrency(investment.total_amount)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b-2 border-primary">
                <span className="text-sm font-medium">{t('investments.totalProfit')}</span>
                <span className={`font-bold ${totalProfit >= 0 ? 'text-profit' : 'text-destructive'}`}>
                  {formatCurrency(totalProfit)}
                </span>
              </div>
              
              <div className="bg-gradient-to-r from-profit/10 to-roi/10 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-roi" />
                  <span className="text-sm font-medium">{t('investments.roi')}</span>
                </div>
                <div className={`text-2xl font-bold ${roi >= 0 ? 'text-roi' : 'text-destructive'}`}>
                  {formatNumber(roi, 1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
          <strong>Nota:</strong> {t('investments.calculatorNote')}
        </div>
      </CardContent>
    </Card>
  );
};