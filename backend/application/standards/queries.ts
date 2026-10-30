import "server-only";
import { readableCatalog } from "@backend/domain/catalog/access";
import { uniqueCatalogNutrients, catalogDefault } from "@backend/domain/catalog/nutrients";

import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";
import { DEFAULT_MACROS_PER_1000_KCAL, DEFAULT_NUTRIENTS_PER_1000_KCAL } from "@backend/domain/nutrition/standards";
import type { BreedStandardsValue, SexStandardValue } from "@/entities/standard";

export async function getBreedStandards(breedId: string): Promise<BreedStandardsValue | null> {
  const userId = (await getCurrentUser())?.id;
  if (!userId) return null;
  const [breed, nutrients, stored] = await Promise.all([
    prisma.breed.findUnique({ where: { id: breedId } }),
    prisma.nutrient.findMany({ where: readableCatalog(userId), orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.breedStandard.findMany({ where: { userId, breedId }, include: { nutrients: true } }),
  ]);
  if (!breed) return null;
  const macros = DEFAULT_MACROS_PER_1000_KCAL[breed.species];
  const nutrientDefaults = DEFAULT_NUTRIENTS_PER_1000_KCAL[breed.species];
  const standards = (["MALE", "FEMALE"] as const).map((sex): SexStandardValue => {
    const current = stored.find((item) => item.sex === sex);
    const values = new Map(current?.nutrients.map((item) => [item.nutrientId, item.amountPer1000Kcal]));
    return {
      sex,
      idealWeight: current?.idealWeight ?? (sex === "MALE" ? breed.maleIdealWeight : breed.femaleIdealWeight),
      proteinPer1000Kcal: current?.proteinPer1000Kcal ?? macros.protein,
      fatPer1000Kcal: current?.fatPer1000Kcal ?? macros.fat,
      carbsPer1000Kcal: current?.carbsPer1000Kcal ?? macros.carbs,
      source: current?.source ?? "FEDIAF 2025 · базовый профиль вида",
      nutrients: uniqueCatalogNutrients(nutrients, new Set(values.keys())).map((nutrient) => ({
        nutrientId: nutrient.id,
        code: nutrient.code,
        name: nutrient.name,
        category: nutrient.category,
        unit: nutrient.unit,
        amountPer1000Kcal: values.get(nutrient.id) ?? catalogDefault(nutrient, nutrientDefaults) ?? null,
      })),
    };
  });
  return { breed: { id: breed.id, nameRu: breed.nameRu, nameEn: breed.nameEn, species: breed.species }, standards };
}
