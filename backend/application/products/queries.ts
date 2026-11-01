import "server-only";

import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";
import { readableCatalog, catalogReferences, canEditCatalog } from "@backend/domain/catalog/access";

export async function getProductEditorData(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const userId = user.id;

  const product = await prisma.product.findFirst({
    where: { id, ...readableCatalog(userId) },
    include: {
      group: { select: { id: true, name: true } },
      nutrients: {
        where: { nutrient: { isReferenceOnly: false } },
        include: { nutrient: true },
        orderBy: { nutrient: { name: "asc" } },
      },
      measures: { orderBy: { name: "asc" } },
      tags: { include: { tag: true } },
    },
  });
  if (!product) return null;
  const references = catalogReferences(userId, product.isShared);
  const [nutrients, groups, tags] = await Promise.all([
    prisma.nutrient.findMany({
      where: { ...references, isReferenceOnly: false },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.productGroup.findMany({
      where: references,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.productTag.findMany({
      where: references,
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    product: {
      id: product.id,
      isShared: product.isShared,
      canEdit: canEditCatalog(product, user),
      source: product.source,
      sourceExternalId: product.sourceExternalId,
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
