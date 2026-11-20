export type CalculationModule = {
  id: string; name: string; species: string; speciesCodes: string[];
  formula: string; description: string | null; versionId: string; templateKey: string | null;
  techBegin: string; techEnd: string;
};
export type FormulaVersion = CalculationModule & {
  moduleId: string; moduleName: string; current: boolean;
};
export type FormulaModuleDetails = {
  id: string; name: string; species: string; speciesCodes: string[];
  archived: boolean; versions: FormulaVersion[];
};
