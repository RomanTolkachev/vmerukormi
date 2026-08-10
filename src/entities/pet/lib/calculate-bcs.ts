export function calculateBcs(actualWeight: number, idealWeight: number) {
  if (actualWeight <= 0 || idealWeight <= 0) return 5;
  return Math.min(9, Math.max(1, Math.round(5 + (actualWeight / idealWeight - 1) * 10)));
}
