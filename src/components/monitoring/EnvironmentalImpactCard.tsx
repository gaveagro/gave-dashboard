import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, Sprout, Calendar, TrendingUp, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AgromonitoringData } from '@/lib/agromonitoring';

interface EnvironmentalImpactCardProps {
  plotName: string;
  totalPlants: number;
  areaHectares: number;
  establishmentYear?: number | null;
  carbonPerPlant?: number; // kg CO2 / plant / year
  maturationYears?: number;
  satelliteHistory?: AgromonitoringData[];
  lastSatelliteDate?: string | null;
  cloudCoverage?: number | null;
}

/** Compact sparkline using SVG only — no extra deps. */
const Sparkline: React.FC<{ values: number[]; width?: number; height?: number }> = ({
  values,
  width = 120,
  height = 32,
}) => {
  if (!values.length) {
    return <div className="h-8 w-[120px] rounded bg-muted/30" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.0001);
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`)
    .join(' ');
  const trendUp = values[values.length - 1] >= values[0];
  const stroke = trendUp ? 'hsl(142 76% 45%)' : 'hsl(0 70% 55%)';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

const formatNumber = (n: number, digits = 0) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

const EnvironmentalImpactCard: React.FC<EnvironmentalImpactCardProps> = ({
  plotName,
  totalPlants,
  areaHectares,
  establishmentYear,
  carbonPerPlant = 0.85,
  maturationYears = 5.5,
  satelliteHistory = [],
  lastSatelliteDate,
  cloudCoverage,
}) => {
  const { t } = useLanguage();

  const { co2Total, daysMonitored, ndviSeries, ndviTrendPct } = useMemo(() => {
    const now = new Date();
    const startYear = establishmentYear ?? now.getFullYear();
    const yearsElapsed = Math.max(0, Math.min(maturationYears, now.getFullYear() - startYear + (now.getMonth() / 12)));
    const maturationProgress = Math.min(1, yearsElapsed / maturationYears);
    // Cumulative CO2 captured (kg)
    const co2 = totalPlants * carbonPerPlant * yearsElapsed;
    const days = Math.round(yearsElapsed * 365);

    const ndviPoints = (satelliteHistory ?? [])
      .map((d) => d.ndvi_mean)
      .filter((v): v is number => typeof v === 'number');

    let trend = 0;
    if (ndviPoints.length >= 2) {
      const first = ndviPoints[0];
      const last = ndviPoints[ndviPoints.length - 1];
      trend = first > 0 ? ((last - first) / first) * 100 : 0;
    }

    return {
      co2Total: co2,
      daysMonitored: days,
      ndviSeries: ndviPoints,
      ndviTrendPct: trend,
    };
  }, [totalPlants, carbonPerPlant, establishmentYear, maturationYears, satelliteHistory]);

  const co2Display = co2Total >= 1000
    ? `${formatNumber(co2Total / 1000, 2)} t`
    : `${formatNumber(co2Total, 0)} kg`;

  const lastPassLabel = lastSatelliteDate
    ? new Date(lastSatelliteDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : t('impact.noSatellitePass');

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5 p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-emerald-400" />

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {t('impact.title')}
          </p>
          <h3 className="text-base font-semibold mt-0.5">{plotName}</h3>
        </div>
        <Button variant="outline" size="sm" className="gap-2" disabled>
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('impact.downloadReport')}</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CO2 */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Leaf className="h-3.5 w-3.5 text-emerald-600" />
            <span>{t('impact.co2Captured')}</span>
          </div>
          <div className="text-2xl font-bold tracking-tight">{co2Display}</div>
          <p className="text-[11px] text-muted-foreground">{t('impact.cumulativeSinceStart')}</p>
        </div>

        {/* Hectares */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sprout className="h-3.5 w-3.5 text-emerald-600" />
            <span>{t('impact.activeHectares')}</span>
          </div>
          <div className="text-2xl font-bold tracking-tight">{formatNumber(areaHectares, 1)} ha</div>
          <p className="text-[11px] text-muted-foreground">
            {formatNumber(totalPlants)} {t('impact.plantsLabel')}
          </p>
        </div>

        {/* NDVI trend */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span>{t('impact.ndviTrend')}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight ${ndviTrendPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {ndviTrendPct >= 0 ? '+' : ''}{formatNumber(ndviTrendPct, 1)}%
            </span>
          </div>
          <Sparkline values={ndviSeries.length ? ndviSeries : [0.3, 0.32, 0.31, 0.34, 0.36, 0.38]} />
        </div>

        {/* Days monitored */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            <span>{t('impact.daysMonitored')}</span>
          </div>
          <div className="text-2xl font-bold tracking-tight">{formatNumber(daysMonitored)}</div>
          <p className="text-[11px] text-muted-foreground">
            {t('impact.lastPass')}: {lastPassLabel}
            {typeof cloudCoverage === 'number' && ` · ${formatNumber(cloudCoverage, 0)}% ${t('impact.clouds')}`}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default EnvironmentalImpactCard;
