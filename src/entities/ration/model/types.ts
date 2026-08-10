export type RationMode = "DAILY" | "WEEKLY";

export type RationPetOption = {
  id: string;
  name: string;
  customerName: string | null;
  latestEnergy: number | null;
};

export type RationListEntry = {
  id: string;
  name: string;
  mode: RationMode;
  targetEnergy: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  pet: { id: string; name: string; customerName: string | null } | null;
  itemCount: number;
  totalGrams: number;
  totalCalories: number;
};

export type RationProductMeasure = {
  id: string;
  name: string;
  grams: number;
};

export type RationProductNutrient = {
  nutrientId: string;
  amount: number | null;
  nutrient: {
    code: string;
    name: string;
    unit: string;
    category: string;
  };
};

export type RationProduct = {
  id: string;
  name: string;
  baseQuantity: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  measures: RationProductMeasure[];
  nutrients: RationProductNutrient[];
};

export type RationItem = {
  id: string;
  productId: string;
  measureId: string | null;
  quantity: number;
  grams: number;
  day: number;
  enabled: boolean;
  product: RationProduct;
  measure: RationProductMeasure | null;
};

export type RationEditorValue = {
  id: string;
  name: string;
  petId: string | null;
  mode: RationMode;
  targetEnergy: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  pet: { id: string; name: string; customerName: string | null } | null;
  items: RationItem[];
};
