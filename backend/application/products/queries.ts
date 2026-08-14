import "server-only";

import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

export async function getProductEditorData(id: string) {
  const userId = (await getCurrentUser())?.id;
  if (!userId) return null;

  const [product, nutrients, groups, tags] = await Promise.all([
    prisma.product.findFirst({
      where: { id, userId },
      include: {
        group: { select: { id: true, name: true } },
        nutrients: {
          include: { nutrient: true },
          orderBy: { nutrient: { name: "asc" } },
        },
        measures: { orderBy: { name: "asc" } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.nutrient.findMany({
      where: { userId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.productGroup.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.productTag.findMany({
      where: { userId },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!product) return null;

  return {
    product: {
      id: product.id,
      name: product.name,
      kind: product.kind,
      groupId: product.groupId,
      baseQuantity: product.baseQuantity,
      unit: product.unit,
      calories: product.calories,
      protein: product.protein,
      fat: product.fat,
      carbs: product.carbs,
      archived: product.archived,
      tagIds: product.tags.map((value) => value.tagId),
      measures: product.measures,
      nutrients: product.nutrients.map((value) => ({
        nutrientId: value.nutrientId,
        amount: value.amount,
        nutrient: value.nutrient,
      })),
    },
    nutrients,
    groups,
    tags,
  };
}
