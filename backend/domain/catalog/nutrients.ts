type NutrientIdentity = { id: string; code: string; unit: string; isShared: boolean };

export function uniqueCatalogNutrients<T extends NutrientIdentity>(nutrients: T[], preferredIds: Set<string> = new Set()) {
  const result = new Map<string, T>();
  for (const nutrient of nutrients) {
    const key = `${nutrient.code}|${nutrient.unit}`;
    const previous = result.get(key);
    if (!previous || preferredIds.has(nutrient.id) || (!preferredIds.has(previous.id) && nutrient.isShared)) result.set(key, nutrient);
  }
  return [...result.values()];
}

const defaultUnits: Record<string, string> = { CP: "г", CFa: "г", Ca: "мг", P: "мг", Fe: "мг", Cu: "мг", Zn: "мг", Mn: "мг", J: "мкг", A: "МЕ", D: "МЕ", B1: "мг", LA: "г" };

export function catalogDefault(nutrient: { code: string; unit: string }, defaults: Record<string, number>) {
  return defaultUnits[nutrient.code] === nutrient.unit ? defaults[nutrient.code] : undefined;
}
