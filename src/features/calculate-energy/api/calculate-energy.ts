import type { EnergyResult } from "@/entities/calculation";
import { requestJson } from "@/shared/api";

export type EnergyCalculationInput = {
  petId: string | null;
  moduleId: string;
  actualWeight: number;
  idealWeight: number;
  bcs: number;
  energyFactor: number;
  lactationWeek: number;
  childrenCount: number;
  breedId?: string | null;
  sex?: "MALE" | "FEMALE" | null;
  adjustedEnergy?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  nutrients?: { nutrientId: string; targetAmount: number }[];
};

export function calculateEnergy(input: EnergyCalculationInput, save = true) {
  return requestJson<EnergyResult>("/api/calculations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, save }),
  });
}
