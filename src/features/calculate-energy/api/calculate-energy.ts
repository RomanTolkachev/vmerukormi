import type { EnergyResult } from "@/entities/calculation/model/types";
import { requestJson } from "@/shared/api/http";

export type EnergyCalculationInput = {
  petId: string | null;
  moduleId: string;
  actualWeight: number;
  idealWeight: number;
  bcs: number;
  energyFactor: number;
  lactationWeek: number;
  childrenCount: number;
};

export function calculateEnergy(input: EnergyCalculationInput) {
  return requestJson<EnergyResult>("/api/calculations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, save: true }),
  });
}
