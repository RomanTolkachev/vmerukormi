import type { Species } from "@/entities/breed/model/types";

export type CalculationModule = {
  id: string;
  name: string;
  species: Species;
  formula: string;
  description: string;
};
