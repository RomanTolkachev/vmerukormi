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
};
