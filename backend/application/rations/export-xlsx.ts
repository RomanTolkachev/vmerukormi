import "server-only";

import { readableCatalog } from "@backend/domain/catalog/access";
import { prisma } from "@backend/infrastructure/database/prisma";
import { buildRationWorkbook } from "./ration-workbook";

function safeFilePart(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "ration";
}

export async function exportRationXlsx(userId: string, rationId: string) {
  const ration = await prisma.ration.findFirst({
    where: { id: rationId, userId },
    include: {
      pet: { include: { breed: { select: { nameRu: true } }, customer: { select: { name: true } } } },
      items: {
        include: {
          measure: true,
          product: {
            include: {
              nutrients: {
                where: { nutrient: { isReferenceOnly: false } },
                include: { nutrient: true },
                orderBy: { nutrient: { category: "asc" } },
              },
            },
          },
        },
        orderBy: [{ day: "asc" }, { id: "asc" }],
      },
      calculation: { include: { nutrients: { include: { nutrient: true } } } },
    },
  });
  if (!ration) return null;
  const nutrients = await prisma.nutrient.findMany({ where: { ...readableCatalog(userId), isReferenceOnly: false } });
  const workbook = buildRationWorkbook(ration, nutrients);
  return {
    buffer: new Uint8Array(await workbook.xlsx.writeBuffer()),
    fileName: `${safeFilePart(ration.name)}.xlsx`,
  };
}
