import type { Species } from "@/entities/breed/@x/module";

export type CalculationModule = {
  id: string;
  name: string;
  species: Species;
  formula: string;
  description: string | null;
  techBegin: string;
  techEnd: string;
};

export type FormulaVersion = {
  id: string;
  moduleId: string;
  moduleName: string;
  species: Species;
  formula: string;
  description: string | null;
  techBegin: string;
  techEnd: string;
  current: boolean;
};

export type FormulaModuleDetails = {
  id: string;
  name: string;
  species: Species;
  archived: boolean;
  versions: FormulaVersion[];
};
