/**
 * Maturation helpers.
 *
 * Espadín does not mature on a fixed date: maturity is reached when the plant
 * starts flowering (the quiote / flower stalk emerges). For display we use an
 * illustrative window of 5.5 to 6.5 years from planting (April of the
 * plantation year). Other species keep their single `maturation_years` value.
 */

export interface MaturationRange {
  min: number; // years
  max: number; // years
}

export const ESPADIN_MATURATION_RANGE: MaturationRange = { min: 5.5, max: 6.5 };

/** Plantings are counted from April of the plantation year. */
const PLANTING_MONTH = 3; // April (0-indexed)

const normalize = (s?: string | null) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function isEspadin(speciesName?: string | null): boolean {
  const n = normalize(speciesName);
  return n.includes('espadin') || n.includes('angustifolia');
}

export function getMaturationRange(
  speciesName?: string | null,
  maturationYears?: number | null,
): MaturationRange {
  if (isEspadin(speciesName)) return ESPADIN_MATURATION_RANGE;
  const y = maturationYears && maturationYears > 0 ? maturationYears : 5.5;
  return { min: y, max: y };
}

export const isRange = (r: MaturationRange) => r.min !== r.max;

/** "5.5 a 6.5" or "6" (no unit). */
export function formatYears(r: MaturationRange, lang: 'es' | 'en' = 'es'): string {
  if (!isRange(r)) return `${r.min}`;
  return `${r.min} ${lang === 'en' ? 'to' : 'a'} ${r.max}`;
}

/** "5.5 a 6.5 años" or "6 años". */
export function formatMaturationRange(years: number, speciesName?: string): string {
  return `${formatYears(getMaturationRange(speciesName, years))} años`;
}

/** Same as formatMaturationRange without the unit. */
export function formatMaturationRangeShort(years: number, speciesName?: string): string {
  return formatYears(getMaturationRange(speciesName, years));
}

export function plantingDate(plantationYear: number): Date {
  return new Date(plantationYear, PLANTING_MONTH, 1);
}

export function monthsSincePlanting(plantationYear: number, now: Date = new Date()): number {
  const p = plantingDate(plantationYear);
  return Math.max(0, (now.getFullYear() - p.getFullYear()) * 12 + (now.getMonth() - p.getMonth()));
}

/** Estimated harvest window (start and end dates). Equal dates for a fixed term. */
export function harvestWindow(plantationYear: number, r: MaturationRange): { start: Date; end: Date } {
  const start = plantingDate(plantationYear);
  start.setMonth(start.getMonth() + Math.round(r.min * 12));
  const end = plantingDate(plantationYear);
  end.setMonth(end.getMonth() + Math.round(r.max * 12));
  return { start, end };
}

/** "2026" or "2026–2027". */
export function formatHarvestYears(plantationYear: number, r: MaturationRange): string {
  const { start, end } = harvestWindow(plantationYear, r);
  const a = start.getFullYear();
  const b = end.getFullYear();
  return a === b ? `${a}` : `${a}–${b}`;
}

/** "octubre 2026" or "octubre 2026 a octubre 2027". */
export function formatHarvestWindow(
  plantationYear: number,
  r: MaturationRange,
  lang: 'es' | 'en' = 'es',
): string {
  const locale = lang === 'en' ? 'en-US' : 'es-MX';
  const fmt = (d: Date) => `${d.toLocaleString(locale, { month: 'long' })} ${d.getFullYear()}`;
  const { start, end } = harvestWindow(plantationYear, r);
  if (!isRange(r)) return fmt(start);
  return `${fmt(start)} ${lang === 'en' ? 'to' : 'a'} ${fmt(end)}`;
}

/**
 * Progress toward maturity, 0–100. For a range, 100% means the plant has
 * reached the start of its maturity window (from then on we watch for the quiote).
 */
export function maturationProgress(plantationYear: number, r: MaturationRange, now: Date = new Date()): number {
  const months = monthsSincePlanting(plantationYear, now);
  return Math.min(100, (months / (r.min * 12)) * 100);
}

/** Years left until the window opens and closes (never negative). */
export function yearsRemaining(plantationYear: number, r: MaturationRange, now: Date = new Date()) {
  const months = monthsSincePlanting(plantationYear, now);
  return {
    min: Math.max(0, r.min * 12 - months) / 12,
    max: Math.max(0, r.max * 12 - months) / 12,
  };
}
