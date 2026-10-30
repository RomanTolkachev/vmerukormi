export type SummaryNutrient = { id: string; code: string; name: string; category: string; unit: string };
type SummaryItem = {
  enabled: boolean;
  grams: number;
  product: { baseQuantity: number; nutrients: { nutrientId: string; amount: number | null; nutrient: Omit<SummaryNutrient, "id"> }[] };
};
type SummaryTarget = { nutrientId: string; targetAmount: number; nutrient: Omit<SummaryNutrient, "id"> };

export function nutrientKey(nutrient: { code: string; unit: string }) {
  return `${nutrient.code}|${nutrient.unit}`;
}

export function summarizeNutrients(items: SummaryItem[], mode: "DAILY" | "WEEKLY", definitions: SummaryNutrient[], targets: SummaryTarget[] = []) {
  const included = items.filter((item) => item.enabled && item.grams > 0);
  const divisor = mode === "WEEKLY" ? 7 : 1;
  const catalog = new Map(definitions.map((nutrient) => [nutrientKey(nutrient), nutrient]));
  const totals = new Map<string, { amount: number; knownItems: number }>();
  for (const item of included) {
    const known = new Set<string>();
    for (const value of item.product.nutrients) {
      const key = nutrientKey(value.nutrient);
      if (!catalog.has(key)) catalog.set(key, { ...value.nutrient, id: value.nutrientId });
      if (value.amount === null || known.has(key)) continue;
      const current = totals.get(key) ?? { amount: 0, knownItems: 0 };
      totals.set(key, { amount: current.amount + value.amount * item.grams / item.product.baseQuantity / divisor, knownItems: current.knownItems + 1 });
      known.add(key);
    }
  }
  const targetMap = new Map(targets.map((target) => [nutrientKey(target.nutrient), target]));
  for (const target of targets) {
    const key = nutrientKey(target.nutrient);
    if (!catalog.has(key)) catalog.set(key, { ...target.nutrient, id: target.nutrientId });
  }
  return [...catalog.entries()].map(([key, nutrient]) => {
    const total = totals.get(key);
    const missingItems = included.length - (total?.knownItems ?? 0);
    return { nutrient, amount: total?.amount ?? 0, missingItems, complete: included.length > 0 && missingItems === 0, target: targetMap.get(key) ?? null };
  }).sort((left, right) => `${left.nutrient.category}-${left.nutrient.name}`.localeCompare(`${right.nutrient.category}-${right.nutrient.name}`, "ru"));
}
