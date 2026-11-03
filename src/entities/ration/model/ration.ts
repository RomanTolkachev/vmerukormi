export type RationMode = "DAILY" | "WEEKLY";

export type RationCustomerOption = {
  id: string;
  name: string;
};

export type RationPetOption = {
  id: string;
  name: string;
  customerId: string | null;
  customerName: string | null;
  latestEnergy: number | null;
};

export type RationCalculationNutrient = {
  nutrientId: string;
  targetAmount: number;
  nutrient: { code: string; name: string; unit: string; category: string };
};

export type RationCalculationOption = {
  id: string;
  petId: string | null;
  petName: string | null;
  moduleName: string;
  createdAt: string;
  adjustedEnergy: number;
  protein: number;
  fat: number;
  carbs: number;
  nutrients: RationCalculationNutrient[];
};

export type RationListEntry = {
  id: string;
  name: string;
  mode: RationMode;
  targetEnergy: number;
  tolerancePercent: number;
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
  tags: { id: string; name: string; slug: string }[];
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

export type RationDetails = {
  id: string;
  name: string;
  petId: string | null;
  calculationId: string | null;
  customerId: string | null;
  mode: RationMode;
  targetEnergy: number;
  tolerancePercent: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  pet: { id: string; name: string; customerName: string | null } | null;
  calculation: RationCalculationOption | null;
};

export type RationEditorValue = RationDetails & { items: RationItem[] };
