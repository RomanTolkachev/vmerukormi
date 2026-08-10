import type { ModuleId } from "./modules";

export type CalculationInput = {
  moduleId: ModuleId;
  actualWeight: number;
  idealWeight: number;
  bcs?: number;
  energyFactor?: number;
  lactationWeek?: number;
  childrenCount?: number;
};

export function calculateEnergy(input: CalculationInput) {
  const aw = input.actualWeight;
  const iw = input.idealWeight;
  const factor = input.energyFactor ?? 1;
  const week = input.lactationWeek ?? 1;
  const children = input.childrenCount ?? 0;
  if (aw <= 0 || iw <= 0) throw new Error("Масса должна быть больше нуля");

  let base: number;
  switch (input.moduleId) {
    case "cat-adult":
    case "cat-senior-cardio": base = 100 * iw ** 0.67; break;
    case "cat-pregnancy": base = 140 * iw ** 0.67; break;
    case "cat-kitten": base = 100 * aw ** 0.67 * 6.7 * (Math.exp(-0.189 * (aw / iw)) - 0.66); break;
    case "cat-lactation": {
      const litterFactor = children < 3 ? 18 : children < 5 ? 60 : 70;
      const lactationFactor = week <= 2 ? 0.9 : week <= 4 ? 1.2 : week === 5 ? 1.1 : 1;
      base = 100 * iw ** 0.67 + iw * litterFactor * lactationFactor;
      break;
    }
    case "dog-pregnancy-1": base = 132 * iw ** 0.75; break;
    case "dog-pregnancy-2": base = 130 * iw ** 0.75 + 26 * iw; break;
    case "dog-adult":
    case "dog-sport": base = 100 * iw ** 0.75; break;
    case "dog-senior-cardio": base = 90 * iw ** 0.75; break;
    case "dog-lactation": {
      const n = Math.min(children, 4);
      const m = Math.min(Math.max(children - 4, 0), 4);
      const lactationFactor = week === 1 ? 0.75 : week === 2 ? 0.95 : week === 3 ? 1.1 : 1.2;
      base = 100 * iw ** 0.75 + iw * (24 * n + 12 * m) * lactationFactor;
      break;
    }
    case "dog-puppy-1":
    case "dog-puppy-2": base = 100 * aw ** 0.75 * 3.2 * (Math.exp(-0.87 * (aw / iw)) - 0.1); break;
    default: throw new Error("Неизвестный модуль");
  }
  return { baseEnergy: Math.round(base), adjustedEnergy: Math.round(base * factor) };
}
