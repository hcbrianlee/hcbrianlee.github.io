export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatGrams(g: number): string {
  if (g < 1) return `${(g * 1000).toFixed(0)} mg`;
  return `${g.toFixed(1)} g`;
}

export function formatMl(ml: number): string {
  if (ml < 1000) return `${ml.toFixed(0)} mL`;
  return `${(ml / 1000).toFixed(2)} L`;
}

export function formatWh(wh: number): string {
  return `${wh.toFixed(2)} Wh`;
}

/** Like formatMl, but keeps 2 decimal places for sub-10 mL values -- the
 * per-1,000-token model comparison numbers are small enough that
 * formatMl's whole-mL rounding would show "0 mL" for a real, nonzero
 * quantity. */
export function formatMlPrecise(ml: number): string {
  if (ml < 10) return `${ml.toFixed(2)} mL`;
  return formatMl(ml);
}
