export type ProductKind = "PRODUCT" | "SUPPLEMENT" | "RECIPE";
export class CatalogError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export type NutrientDefinition = { id: string; code: string; name: string; category: string; unit: string };
export type NutrientValue = { nutrientId: string; amount: number | null; nutrient: NutrientDefinition };
export type Nutrition = { calories: number; protein: number; fat: number; carbs: number; nutrients: NutrientValue[] };
export type IngredientSnapshot = Nutrition & { id: string; name: string; kind: ProductKind; revision: number; baseQuantity: number; unit: string };
export type RecipeIngredient = { productId: string; grams: number; snapshot: IngredientSnapshot };
export type ProductDraft = Nutrition & {
  name: string; kind: ProductKind; groupId: string | null; baseQuantity: number; unit: string;
  archived: boolean; tagIds: string[]; measures: { id: string; name: string; grams: number }[];
  recipeYieldGrams: number | null; recipeIngredients: RecipeIngredient[];
  recipeInstructions: string; recipeNotes: string;
};

export function recipeNutrientKey(nutrient: Pick<NutrientDefinition, "code" | "unit">) {
  return `${nutrient.code}|${nutrient.unit}`;
}

export function emptyProduct(): ProductDraft {
  return { name: "", kind: "PRODUCT", groupId: null, baseQuantity: 100, unit: "г", calories: 0, protein: 0, fat: 0, carbs: 0, archived: false, tagIds: [], measures: [], nutrients: [], recipeYieldGrams: null, recipeIngredients: [], recipeInstructions: "", recipeNotes: "" };
}

export function massInGrams(value: number, unit: string): number {
  const factors: Record<string, number> = { "г": 1, "мг": 0.001, "мкг": 0.000001, "кг": 1000 };
  const factor = factors[unit.trim().toLowerCase()];
  if (!factor || !(value > 0)) throw new Error("Для ингредиента нужна базовая масса в г, мг, мкг или кг");
  return value * factor;
}

export function calculateRecipe(ingredients: RecipeIngredient[], yieldGrams: number | null): Nutrition {
  const totals: Nutrition = { calories: 0, protein: 0, fat: 0, carbs: 0, nutrients: [] };
  if (!ingredients.length) return totals;
  if (!yieldGrams || !Number.isFinite(yieldGrams) || yieldGrams <= 0) throw new Error("Укажите положительную массу готового блюда");
  const definitions = new Map(ingredients.flatMap(ingredient => ingredient.snapshot.nutrients.map(value => [recipeNutrientKey(value.nutrient), value.nutrient] as const)));
  const amounts = new Map<string, number | null>([...definitions.keys()].map(id => [id, 0]));
  for (const ingredient of ingredients) {
    if (!Number.isFinite(ingredient.grams) || ingredient.grams <= 0) throw new Error("Количество ингредиента должно быть больше нуля");
    if (ingredient.snapshot.kind === "RECIPE") throw new Error("Вложенные рецепты запрещены");
    const factor = ingredient.grams / massInGrams(ingredient.snapshot.baseQuantity, ingredient.snapshot.unit) * 100 / yieldGrams;
    for (const key of ["calories", "protein", "fat", "carbs"] as const) totals[key] += ingredient.snapshot[key] * factor;
    for (const id of definitions.keys()) {
      const value = ingredient.snapshot.nutrients.find(value => recipeNutrientKey(value.nutrient) === id);
      const previous = amounts.get(id);
      amounts.set(id, previous == null || value?.amount == null ? null : previous + value.amount * factor);
    }
  }
  totals.nutrients = [...definitions].map(([key, nutrient]) => ({ nutrientId: nutrient.id, nutrient, amount: amounts.get(key) ?? null }));
  if ([totals.calories, totals.protein, totals.fat, totals.carbs, ...totals.nutrients.map(value => value.amount ?? 0)].some(value => !Number.isFinite(value))) throw new Error("Слишком большие значения состава");
  return totals;
}

export function changeProductKind(draft: ProductDraft, kind: ProductKind): ProductDraft {
  if (draft.kind === "RECIPE" && kind !== "RECIPE") return { ...draft, kind, calories: 0, protein: 0, fat: 0, carbs: 0, nutrients: draft.nutrients.map(value => ({ ...value, amount: 0 })), recipeIngredients: [], recipeYieldGrams: null, recipeInstructions: "", recipeNotes: "" };
  if (kind === "RECIPE" && draft.kind !== "RECIPE") {
    const factor = 100 / massInGrams(draft.baseQuantity, draft.unit);
    return { ...draft, kind, baseQuantity: 100, unit: "г", calories: draft.calories * factor, protein: draft.protein * factor, fat: draft.fat * factor, carbs: draft.carbs * factor, nutrients: draft.nutrients.map(value => ({ ...value, amount: value.amount === null ? null : value.amount * factor })) };
  }
  return { ...draft, kind };
}
