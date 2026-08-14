export type CalculationHistoryItem = {
  id: string;
  adjustedEnergy: number;
  baseEnergy: number;
  createdAt: string;
  pet: { name: string } | null;
  module: { name: string };
};

export type EnergyResult = {
  baseEnergy: number;
  adjustedEnergy: number;
  protein: number;
  fat: number;
  carbs: number;
  standardSource: string;
  standardNutrients: {
    nutrientId: string;
    code: string;
    name: string;
    category: string;
    unit: string;
    targetAmount: number | null;
  }[];
};
