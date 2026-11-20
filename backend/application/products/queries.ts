import "server-only";

import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";
import { readableCatalog } from "@backend/domain/catalog/access";
import { productData } from "./versions";

export async function getProductEditorData(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const product = await prisma.product.findFirst({
    where: { id, deletedAt: {}, ...readableCatalog(user) },
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
  return {
    product: productData(product, user),
  };
}
