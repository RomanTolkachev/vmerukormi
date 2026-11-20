import "server-only";
import { readableCatalog } from "@backend/domain/catalog/access";
import { uniqueCatalogNutrients, catalogDefault } from "@backend/domain/catalog/nutrients";

import type { Sex } from "@prisma/client";
import { prisma } from "@backend/infrastructure/database/prisma";
import {
  DEFAULT_MACROS_PER_1000_KCAL,
  DEFAULT_NUTRIENTS_PER_1000_KCAL,
  scalePer1000,
} from "@backend/domain/nutrition/standards";

export async function getCalculationStandards(input: {
  userId: string;
  species: string;
  breedId?: string | null;
  sex?: Sex | null;
  energy: number;
}) {
  const [override, nutrients] = await Promise.all([
    input.breedId && input.sex
      ? prisma.breedStandard.findUnique({
          where: { userId_breedId_sex: { userId: input.userId, breedId: input.breedId, sex: input.sex } },
          include: { nutrients: { where: { nutrient: { isReferenceOnly: false } }, include: { nutrient: true } } },
        })
      : null,
    prisma.nutrient.findMany({ where: { ...readableCatalog(input.userId), isReferenceOnly: false }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  const standardSpecies = input.species === "CAT" || input.species === "DOG" ? input.species : null;
  const baseMacros = standardSpecies ? DEFAULT_MACROS_PER_1000_KCAL[standardSpecies] : { protein: 0, fat: 0, carbs: 0 };
  const macros = {
    protein: scalePer1000(override?.proteinPer1000Kcal ?? baseMacros.protein, input.energy),
    fat: scalePer1000(override?.fatPer1000Kcal ?? baseMacros.fat, input.energy),
    carbs: scalePer1000(override?.carbsPer1000Kcal ?? baseMacros.carbs, input.energy),
  };
  const overrides = new Map(override?.nutrients.map((item) => [item.nutrientId, item.amountPer1000Kcal]));
  const defaults = standardSpecies ? DEFAULT_NUTRIENTS_PER_1000_KCAL[standardSpecies] : {};

  return {
    macros,
    nutrients: uniqueCatalogNutrients(nutrients, new Set(overrides.keys())).map((nutrient) => {
      const per1000 = overrides.get(nutrient.id) ?? catalogDefault(nutrient, defaults);
      return {
        nutrientId: nutrient.id,
        code: nutrient.code,
        name: nutrient.name,
        category: nutrient.category,
        unit: nutrient.unit,
        targetAmount: per1000 === undefined ? null : scalePer1000(per1000, input.energy),
      };
    }),
    source: override?.source ?? (standardSpecies ? "FEDIAF 2025 · базовый профиль вида" : "Для этого вида нет базовых норм. Заполните КБЖУ и нутриенты вручную; нули не означают нулевую потребность"),
  };
}
