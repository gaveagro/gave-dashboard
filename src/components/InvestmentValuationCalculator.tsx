import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp, Minus } from 'lucide-react';

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
  // Estados para los parámetros ajustables
  const [pricePerKg, setPricePerKg] = useState([150]); // Rango base MXN por kg
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
          Calculadora de Valuación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Parámetros de Entrada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Precio por kg */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Precio por kg estimado: {formatCurrency(pricePerKg[0])} MXN
            </Label>
            <Slider
              value={pricePerKg}
              onValueChange={setPricePerKg}
              min={100}
              max={300}
              step={5}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>$100 MXN/kg</span>
              <span>$300 MXN/kg</span>
            </div>
          </div>

          {/* Peso por planta */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Peso por planta: {formatNumber(weightPerPlant[0])} kg
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
          <h4 className="font-medium mb-3 text-sm">Datos de tu Inversión</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Plantas</div>
              <div className="font-medium">{formatNumber(investment.plant_count)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Precio pagado/planta</div>
              <div className="font-medium">{formatCurrency(investment.price_per_plant)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Inversión total</div>
              <div className="font-medium">{formatCurrency(investment.total_amount)}</div>
            </div>
          </div>
        </div>

        {/* Resultados de la Calculadora */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Proyección de Valuación</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Columna de Ingresos */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-muted">
                <span className="text-sm text-muted-foreground">Peso total estimado</span>
                <span className="font-medium">{formatNumber(totalWeightKg)} kg</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-muted">
                <span className="text-sm text-muted-foreground">Ingreso bruto</span>
                <span className="font-medium text-profit">{formatCurrency(grossRevenue)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-muted">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Minus className="h-3 w-3" />
                  Comisión Gavé (15%)
                </span>
                <span className="font-medium text-destructive">-{formatCurrency(gaveCommission)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b-2 border-primary">
                <span className="text-sm font-medium">Ingreso neto</span>
                <span className="font-bold text-profit">{formatCurrency(netRevenue)}</span>
              </div>
            </div>

            {/* Columna de ROI */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-muted">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Minus className="h-3 w-3" />
                  Inversión inicial
                </span>
                <span className="font-medium text-investment">-{formatCurrency(investment.total_amount)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b-2 border-primary">
                <span className="text-sm font-medium">Ganancia total</span>
                <span className={`font-bold ${totalProfit >= 0 ? 'text-profit' : 'text-destructive'}`}>
                  {formatCurrency(totalProfit)}
                </span>
              </div>
              
              <div className="bg-gradient-to-r from-profit/10 to-roi/10 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-roi" />
                  <span className="text-sm font-medium">ROI</span>
                </div>
                <div className={`text-2xl font-bold ${roi >= 0 ? 'text-roi' : 'text-destructive'}`}>
                  {formatNumber(roi, 1)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
          <strong>Nota:</strong> Estos cálculos son estimaciones basadas en condiciones ideales de mercado. 
          Los precios reales pueden variar según la oferta, demanda y calidad del producto al momento de la venta.
        </div>
      </CardContent>
    </Card>
  );
};