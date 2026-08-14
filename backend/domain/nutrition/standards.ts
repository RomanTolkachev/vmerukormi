export type StandardSpecies = "CAT" | "DOG";

export const MODIFIED_ATWATER = {
  protein: 3.5,
  fat: 8.5,
  carbs: 3.5,
} as const;

export function energyFromMacros(protein: number, fat: number, carbs: number) {
  return protein * MODIFIED_ATWATER.protein + fat * MODIFIED_ATWATER.fat + carbs * MODIFIED_ATWATER.carbs;
}

export const DEFAULT_MACROS_PER_1000_KCAL: Record<StandardSpecies, { protein: number; fat: number; carbs: number }> = {
  DOG: { protein: 52.1, fat: 13.75, carbs: 200.22 },
  CAT: { protein: 62.5, fat: 22.5, carbs: 168.57 },
};

// FEDIAF 2025, взрослые животные, значения на 1000 ккал ОЭ.
// Значения приведены к единицам, используемым текущим справочником приложения.
export const DEFAULT_NUTRIENTS_PER_1000_KCAL: Record<StandardSpecies, Record<string, number>> = {
  DOG: {
    CP: 52.1, CFa: 13.75, Ca: 1450, P: 1160, Fe: 10.4, Cu: 2.08,
    Zn: 20.8, Mn: 1.67, J: 0.3, A: 1754, D3: 159, B1: 0.62, LA: 3.82,
  },
  CAT: {
    CP: 62.5, CFa: 22.5, Ca: 1000, P: 640, Fe: 20, Cu: 1.25,
    Zn: 18.8, Mn: 1.25, J: 0.33, A: 833, D3: 62.5, B1: 1.1, LA: 1.25,
  },
};

export function scalePer1000(value: number, energy: number) {
  return value * energy / 1000;
}
