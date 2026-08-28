export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatGrams(g: number): string {
  if (g < 1) return `${(g * 1000).toFixed(0)} mg`;
  if (g < 1000) return `${g.toFixed(1)} g`;
  if (g < 1_000_000) return `${(g / 1000).toFixed(1)} kg`;
  return `${(g / 1_000_000).toFixed(1)} metric tons`;
}

function formatGramsAsUnit(g: number, unit: "mg" | "g" | "kg" | "metric tons"): string {
  switch (unit) {
    case "mg":
      return `${(g * 1000).toFixed(0)} mg`;
    case "g":
      return `${g.toFixed(1)} g`;
    case "kg":
      return `${(g / 1000).toFixed(1)} kg`;
    case "metric tons":
      return `${(g / 1_000_000).toFixed(1)} metric tons`;
  }
}

/**
 * Formats two related gram values (e.g. heavy vs. light model CO2) in the
 * SAME unit, rather than each independently picking its own best-fit unit
 * via formatGrams -- otherwise a smaller and larger value can end up in
 * different units (e.g. "34 mg" vs "2.6 g"), which reads as inconsistent
 * when shown side by side for direct comparison. The unit is chosen from
 * the smaller of the two values.
 */
export function formatGramsPair(a: number, b: number): [string, string] {
  const smaller = Math.min(a, b);
  const unit = smaller < 1 ? "mg" : smaller < 1000 ? "g" : smaller < 1_000_000 ? "kg" : "metric tons";
  return [formatGramsAsUnit(a, unit), formatGramsAsUnit(b, unit)];
}

export function formatMl(ml: number): string {
  if (ml < 1000) return `${ml.toFixed(0)} mL`;
  if (ml < 1_000_000) return `${(ml / 1000).toFixed(2)} L`;
  return `${(ml / 1_000_000).toFixed(1)} m³`;
}

export function formatWh(wh: number): string {
  if (wh < 1000) return `${wh.toFixed(2)} Wh`;
  if (wh < 1_000_000) return `${(wh / 1000).toFixed(2)} kWh`;
  if (wh < 1_000_000_000) return `${(wh / 1_000_000).toFixed(2)} MWh`;
  return `${(wh / 1_000_000_000).toFixed(2)} GWh`;
}

/** "driving X miles" equivalence for a CO2 mass -- same "big number, small word" idea as formatUserCount. */
export function formatMiles(miles: number): string {
  if (miles >= 1_000_000_000) return `${(miles / 1_000_000_000).toFixed(1)} billion miles`;
  if (miles >= 1_000_000) return `${(miles / 1_000_000).toFixed(1)} million miles`;
  if (miles >= 1000) return `${Math.round(miles).toLocaleString()} miles`;
  if (miles >= 1) return `${miles.toFixed(1)} miles`;
  return `${Math.round(miles * 5280).toLocaleString()} feet`;
}

/** "900 million" / "1.2 billion" style display for large hypothetical group sizes in nudge copy. */
export function formatUserCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)} billion`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} million`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${n}`;
}

/** Like formatMl, but keeps 2 decimal places for sub-10 mL values -- the
 * per-1,000-token model comparison numbers are small enough that
 * formatMl's whole-mL rounding would show "0 mL" for a real, nonzero
 * quantity. */
export function formatMlPrecise(ml: number): string {
  if (ml < 10) return `${ml.toFixed(2)} mL`;
  return formatMl(ml);
}
