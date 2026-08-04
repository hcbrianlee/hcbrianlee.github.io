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
