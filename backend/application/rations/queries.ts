import "server-only";

import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";
import type {
  RationEditorValue,
  RationListEntry,
  RationPetOption,
  RationProduct,
  RationItem,
} from "@/entities/ration/model/types";

const productInclude = {
  measures: { orderBy: { name: "asc" as const } },
  nutrients: {
    include: { nutrient: true },
    orderBy: { nutrient: { category: "asc" as const } },
  },
};

function serializeProduct(product: {
  id: string;
  name: string;
  baseQuantity: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  measures: { id: string; name: string; grams: number }[];
  nutrients: {
    nutrientId: string;
    amount: number | null;
    nutrient: { code: string; name: string; unit: string; category: string };
  }[];
}): RationProduct {
  return product;
}

function petOption(pet: {
  id: string;
  name: string;
  customer: { name: string } | null;
  calculations: { adjustedEnergy: number }[];
}): RationPetOption {
  return {
    id: pet.id,
    name: pet.name,
    customerName: pet.customer?.name ?? null,
    latestEnergy: pet.calculations[0]?.adjustedEnergy ?? null,
  };
}

export async function getRationsPageData() {
  const userId = (await getCurrentUser())?.id;
  if (!userId) return { rations: [] as RationListEntry[], pets: [] as RationPetOption[] };

  const [rations, pets] = await Promise.all([
    prisma.ration.findMany({
      where: { userId },
      include: {
        pet: { include: { customer: { select: { name: true } } } },
        items: { include: { product: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.pet.findMany({
      where: { userId },
      include: {
        customer: { select: { name: true } },
        calculations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { adjustedEnergy: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    pets: pets.map(petOption),
    rations: rations.map((ration): RationListEntry => {
      const enabledItems = ration.items.filter((item) => item.enabled);
      const totalGrams = enabledItems.reduce((sum, item) => sum + item.grams, 0);
      const weeklyCalories = enabledItems.reduce(
        (sum, item) =>
          sum + (item.product.calories * item.grams) / item.product.baseQuantity,
        0,
      );
      return {
        id: ration.id,
        name: ration.name,
        mode: ration.mode,
        targetEnergy: ration.targetEnergy,
        note: ration.note,
        createdAt: ration.createdAt.toISOString(),
        updatedAt: ration.updatedAt.toISOString(),
        pet: ration.pet
          ? {
              id: ration.pet.id,
              name: ration.pet.name,
              customerName: ration.pet.customer?.name ?? null,
            }
          : null,
        itemCount: ration.items.length,
        totalGrams,
        totalCalories:
          ration.mode === "WEEKLY" ? weeklyCalories / 7 : weeklyCalories,
      };
    }),
  };
}

export async function getRationEditorData(id: string) {
  const userId = (await getCurrentUser())?.id;
  if (!userId) return null;

  const ration = await prisma.ration.findFirst({
    where: { id, userId },
    include: {
      pet: { include: { customer: { select: { name: true } } } },
      items: {
        include: {
          measure: true,
          product: { include: productInclude },
        },
        orderBy: [{ day: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!ration) return null;

  const [products, pets] = await Promise.all([
    prisma.product.findMany({
      where: { userId, archived: false },
      include: productInclude,
      orderBy: { name: "asc" },
    }),
    prisma.pet.findMany({
      where: { userId },
      include: {
        customer: { select: { name: true } },
        calculations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { adjustedEnergy: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const value: RationEditorValue = {
    id: ration.id,
    name: ration.name,
    petId: ration.petId,
    mode: ration.mode,
    targetEnergy: ration.targetEnergy,
    note: ration.note,
    createdAt: ration.createdAt.toISOString(),
    updatedAt: ration.updatedAt.toISOString(),
    pet: ration.pet
      ? {
          id: ration.pet.id,
          name: ration.pet.name,
          customerName: ration.pet.customer?.name ?? null,
        }
      : null,
    items: ration.items.map(
      (item): RationItem => ({
        id: item.id,
        productId: item.productId,
        measureId: item.measureId,
        quantity: item.quantity,
        grams: item.grams,
        day: item.day,
        enabled: item.enabled,
        product: serializeProduct(item.product),
        measure: item.measure,
      }),
    ),
  };

  return {
    ration: value,
    products: products.map(serializeProduct),
    pets: pets.map(petOption),
  };
}
