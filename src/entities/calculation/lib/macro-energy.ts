export function macroEnergy(protein: number, fat: number, carbs: number) {
  return Math.round(protein * 3.5 + fat * 8.5 + carbs * 3.5);
}
