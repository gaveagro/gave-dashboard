/**
 * Formats the maturation period for display.
 * For Espadín, shows "5.5 a 6 años". For others, shows "{years} años".
 */
export function formatMaturationRange(years: number, speciesName?: string): string {
  const isEspadin = speciesName?.toLowerCase().includes('espadín') || speciesName?.toLowerCase().includes('espadin');
  if (isEspadin) {
    return '5.5 a 6 años';
  }
  return `${years} años`;
}

/**
 * Returns just the range text without "años" suffix.
 */
export function formatMaturationRangeShort(years: number, speciesName?: string): string {
  const isEspadin = speciesName?.toLowerCase().includes('espadín') || speciesName?.toLowerCase().includes('espadin');
  if (isEspadin) {
    return '5.5 a 6';
  }
  return `${years}`;
}
