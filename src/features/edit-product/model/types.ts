export type ProductKind = "PRODUCT" | "SUPPLEMENT" | "RECIPE";

export type ProductNutrientValue = {
  nutrientId: string;
  amount: number | null;
  nutrient: { id: string; code: string; name: string; category: string; unit: string };
};

export type EditableProduct = {
  id: string;
  name: string;
  kind: ProductKind;
  groupId: string | null;
  baseQuantity: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  archived: boolean;
  tagIds: string[];
  nutrients: ProductNutrientValue[];
};

export type NutrientOption = ProductNutrientValue["nutrient"];
export type ProductGroupOption = { id: string; name: string };
export type ProductTagOption = { id: string; name: string; slug: string };
