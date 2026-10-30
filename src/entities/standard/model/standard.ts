import type { Sex } from "@/entities/pet/@x/standard";
import type { Species } from "@/entities/breed/@x/standard";

export type StandardNutrientValue = {
  nutrientId: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  amountPer1000Kcal: number | null;
};

export type SexStandardValue = {
  sex: Exclude<Sex, "">;
  idealWeight: number;
  proteinPer1000Kcal: number;
  fatPer1000Kcal: number;
  carbsPer1000Kcal: number;
  source: string;
  nutrients: StandardNutrientValue[];
};

export type BreedStandardsValue = {
  breed: { id: string; nameRu: string; nameEn: string; species: Species };
  standards: SexStandardValue[];
};
