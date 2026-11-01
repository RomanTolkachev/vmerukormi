import { isVisibleNutrient, requiredRationNutrients } from "@backend/domain/catalog/nutrient-conventions";

export type SummaryNutrient = { id: string; code: string; name: string; category: string; unit: string; isReferenceOnly?: boolean };
type SummaryItem = {
  enabled: boolean;
  grams: number;
  product: { baseQuantity: number; calories?: number; protein?: number; fat?: number; carbs?: number; nutrients: { nutrientId: string; amount: number | null; nutrient: Omit<SummaryNutrient, "id"> }[] };
};
type SummaryTarget = { nutrientId: string; targetAmount: number; nutrient: Omit<SummaryNutrient, "id"> };

export function nutrientKey(nutrient: { code: string; unit: string }) {
  return `${nutrient.code}|${nutrient.unit}`;
}

export function summarizeNutrients(items: SummaryItem[], mode: "DAILY" | "WEEKLY", definitions: SummaryNutrient[], targets: SummaryTarget[] = []) {
  const included = items.filter((item) => item.enabled && item.grams > 0);
  const divisor = mode === "WEEKLY" ? 7 : 1;
  const catalog = new Map(requiredRationNutrients.map((nutrient) => {
    const definition = definitions.find((value) => isVisibleNutrient(value) && nutrientKey(value) === nutrientKey(nutrient));
    return [nutrientKey(nutrient), { ...nutrient, id: definition?.id ?? `required-${nutrient.code}` }];
  }));
  const totals = new Map<string, { amount: number; knownItems: number }>();
  for (const item of included) {
    const known = new Set<string>();
    const macroValues = ([['Energy', 'calories'], ['CP', 'protein'], ['CFa', 'fat'], ['CH', 'carbs']] as const).flatMap(([code, field]) => {
      const amount = item.product[field];
      const nutrient = requiredRationNutrients.find((value) => value.code === code)!;
      return amount === undefined ? [] : [{ nutrientId: `required-${code}`, amount, nutrient }];
    });
    for (const value of [...macroValues, ...item.product.nutrients]) {
      if (!isVisibleNutrient(value.nutrient) || value.amount === null) continue;
      const key = nutrientKey(value.nutrient);
      if (!catalog.has(key)) catalog.set(key, { ...value.nutrient, id: value.nutrientId });
      if (known.has(key)) continue;
      const current = totals.get(key) ?? { amount: 0, knownItems: 0 };
      totals.set(key, { amount: current.amount + value.amount * item.grams / item.product.baseQuantity / divisor, knownItems: current.knownItems + 1 });
      known.add(key);
    }
  }
  const targetMap = new Map(targets.filter((target) => isVisibleNutrient(target.nutrient)).map((target) => [nutrientKey(target.nutrient), target]));
  return [...catalog.entries()].map(([key, nutrient]) => {
    const total = totals.get(key);
    const missingItems = included.length - (total?.knownItems ?? 0);
    return { nutrient, amount: total?.amount ?? 0, missingItems, complete: included.length > 0 && missingItems === 0, target: targetMap.get(key) ?? null };
  }).sort((left, right) => `${left.nutrient.category}-${left.nutrient.name}`.localeCompare(`${right.nutrient.category}-${right.nutrient.name}`, "ru"));
}
