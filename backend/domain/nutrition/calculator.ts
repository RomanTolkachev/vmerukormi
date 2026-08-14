import { MODULES } from "./modules";
import { evaluateExpression } from "./expression";

export type CalculationInput = {
  moduleId: string;
  actualWeight: number;
  idealWeight: number;
  bcs?: number;
  energyFactor?: number;
  lactationWeek?: number;
  childrenCount?: number;
};

export function calculateEnergy(input: CalculationInput, formula?: string) {
  const aw = input.actualWeight;
  const iw = input.idealWeight;
  const factor = input.energyFactor ?? 1;
  const week = input.lactationWeek ?? 1;
  const children = input.childrenCount ?? 0;
  if (aw <= 0 || iw <= 0) throw new Error("Масса должна быть больше нуля");

  let K = 0;
  let L = 1;
  let N = 0;
  let M = 0;
  switch (input.moduleId) {
    case "cat-lactation": {
      K = children < 3 ? 18 : children < 5 ? 60 : 70;
      L = week <= 2 ? 0.9 : week <= 4 ? 1.2 : week === 5 ? 1.1 : 1;
      break;
    }
    case "dog-lactation": {
      N = Math.min(children, 4);
      M = Math.min(Math.max(children - 4, 0), 4);
      L = week === 1 ? 0.75 : week === 2 ? 0.95 : week === 3 ? 1.1 : 1.2;
      break;
    }
  }
  const source = formula ?? MODULES.find((item) => item.id === input.moduleId)?.formula;
  if (!source) throw new Error("Неизвестный модуль");
  const base = evaluateExpression(source, { AW: aw, IW: iw, WEEK: week, CHILDREN: children, K, L, N, M });
  return { baseEnergy: Math.round(base), adjustedEnergy: Math.round(base * factor) };
}
