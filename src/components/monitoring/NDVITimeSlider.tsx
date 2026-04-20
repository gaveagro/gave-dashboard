import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AgromonitoringData } from '@/lib/agromonitoring';

interface NDVITimeSliderProps {
  history: AgromonitoringData[];
  onFrameChange?: (frame: AgromonitoringData | null) => void;
}

/**
 * Time-slider for NDVI / satellite imagery frames.
 * Uses already-stored agromonitoring_data rows (sorted by date).
 */
const NDVITimeSlider: React.FC<NDVITimeSliderProps> = ({ history, onFrameChange }) => {
  const { t } = useLanguage();
  const sorted = useMemo(
    () => [...(history ?? [])].sort((a, b) => a.measurement_date.localeCompare(b.measurement_date)),
    [history]
  );
  const [index, setIndex] = useState(Math.max(0, sorted.length - 1));
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setIndex(Math.max(0, sorted.length - 1));
  }, [sorted.length]);

  useEffect(() => {
    onFrameChange?.(sorted[index] ?? null);
  }, [index, sorted, onFrameChange]);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setIndex((prev) => {
        if (sorted.length === 0) return 0;
        return prev >= sorted.length - 1 ? 0 : prev + 1;
      });
    }, 700);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [playing, sorted.length]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-center text-xs text-muted-foreground">
        {t('timeslider.noFrames')}
      </div>
    );
  }

  const current = sorted[index];
  const dateLabel = new Date(current.measurement_date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t('timeslider.pause') : t('timeslider.play')}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs font-semibold">{dateLabel}</p>
          <p className="text-[10px] text-muted-foreground">
            NDVI: {current.ndvi_mean?.toFixed(3) ?? 'N/A'}
            {' · '}
            {index + 1} / {sorted.length}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground w-8 text-right">{t('timeslider.frames')}</span>
      </div>
      <Slider
        value={[index]}
        min={0}
        max={Math.max(0, sorted.length - 1)}
        step={1}
        onValueChange={([v]) => {
          setPlaying(false);
          setIndex(v);
        }}
      />
    </div>
  );
};

export default NDVITimeSlider;
