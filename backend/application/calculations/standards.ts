import "server-only";

import type { Sex, Species } from "@prisma/client";
import { prisma } from "@backend/infrastructure/database/prisma";
import {
  DEFAULT_MACROS_PER_1000_KCAL,
  DEFAULT_NUTRIENTS_PER_1000_KCAL,
  scalePer1000,
} from "@backend/domain/nutrition/standards";

export async function getCalculationStandards(input: {
  userId: string;
  species: Species;
  breedId?: string | null;
  sex?: Sex | null;
  energy: number;
}) {
  const [override, nutrients] = await Promise.all([
    input.breedId && input.sex
      ? prisma.breedStandard.findUnique({
          where: { userId_breedId_sex: { userId: input.userId, breedId: input.breedId, sex: input.sex } },
          include: { nutrients: { include: { nutrient: true } } },
        })
      : null,
    prisma.nutrient.findMany({ where: { userId: input.userId }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  const baseMacros = DEFAULT_MACROS_PER_1000_KCAL[input.species];
  const macros = {
    protein: scalePer1000(override?.proteinPer1000Kcal ?? baseMacros.protein, input.energy),
    fat: scalePer1000(override?.fatPer1000Kcal ?? baseMacros.fat, input.energy),
    carbs: scalePer1000(override?.carbsPer1000Kcal ?? baseMacros.carbs, input.energy),
  };
  const overrides = new Map(override?.nutrients.map((item) => [item.nutrientId, item.amountPer1000Kcal]));
  const defaults = DEFAULT_NUTRIENTS_PER_1000_KCAL[input.species];

  return {
    macros,
    nutrients: nutrients.map((nutrient) => {
      const per1000 = overrides.get(nutrient.id) ?? defaults[nutrient.code];
      return {
        nutrientId: nutrient.id,
        code: nutrient.code,
        name: nutrient.name,
        category: nutrient.category,
        unit: nutrient.unit,
        targetAmount: per1000 === undefined ? null : scalePer1000(per1000, input.energy),
      };
    }),
    source: override?.source ?? "FEDIAF 2025 · базовый профиль вида",
  };
}
