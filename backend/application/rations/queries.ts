import "server-only";
import { readableCatalog } from "@backend/domain/catalog/access";

import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";
import { serializeRationDetails } from "./ration-details";
import type {
  RationEditorValue,
  RationListEntry,
  RationPetOption,
  RationProduct,
  RationItem,
  RationCalculationOption,
  RationCustomerOption,
} from "@/entities/ration";

const productInclude = {
  measures: { orderBy: { name: "asc" as const } },
  nutrients: {
    where: { nutrient: { isReferenceOnly: false } },
    include: { nutrient: true },
    orderBy: { nutrient: { category: "asc" as const } },
  },
  tags: { include: { tag: true } },
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
  tags: { tag: { id: string; name: string; slug: string } }[];
}): RationProduct {
  return { ...product, tags: product.tags.map((value) => value.tag).sort((a, b) => a.name.localeCompare(b.name, "ru")) };
}

function petOption(pet: {
  id: string;
  name: string;
  customer: { name: string } | null;
  customerId: string | null;
  calculations: { adjustedEnergy: number }[];
}): RationPetOption {
  return {
    id: pet.id,
    name: pet.name,
    customerId: pet.customerId,
    customerName: pet.customer?.name ?? null,
    latestEnergy: pet.calculations[0]?.adjustedEnergy ?? null,
  };
}

function calculationOption(calculation: {
  id: string;
  petId: string | null;
  adjustedEnergy: number;
  protein: number;
  fat: number;
  carbs: number;
  createdAt: Date;
  pet: { name: string } | null;
  module: { name: string };
  nutrients: { nutrientId: string; targetAmount: number; nutrient: { code: string; name: string; unit: string; category: string } }[];
}): RationCalculationOption {
  return {
    ...calculation,
    petName: calculation.pet?.name ?? null,
    moduleName: calculation.module.name,
    createdAt: calculation.createdAt.toISOString(),
  };
}

export async function getRationsPageData() {
  const userId = (await getCurrentUser())?.id;
  if (!userId) return { rations: [] as RationListEntry[], customers: [] as RationCustomerOption[], pets: [] as RationPetOption[], calculations: [] as RationCalculationOption[] };

  const [rations, customers, pets, calculations] = await Promise.all([
    prisma.ration.findMany({
      where: { userId },
      include: {
        pet: { include: { customer: { select: { name: true } } } },
        items: { include: { product: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.customer.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
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
    prisma.calculation.findMany({
      where: { userId },
      include: { pet: { select: { name: true } }, module: { select: { name: true } }, nutrients: { include: { nutrient: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    customers,
    pets: pets.map(petOption),
    calculations: calculations.map(calculationOption),
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
        tolerancePercent: ration.tolerancePercent,
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
      calculation: { include: { pet: { select: { name: true } }, module: { select: { name: true } }, nutrients: { include: { nutrient: true } } } },
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

  const [products, nutrients] = await Promise.all([
    prisma.product.findMany({
      where: { ...readableCatalog(userId), archived: false },
      include: productInclude,
      orderBy: { name: "asc" },
    }),
    prisma.nutrient.findMany({ where: { ...readableCatalog(userId), isReferenceOnly: false }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);

  const value: RationEditorValue = {
    ...serializeRationDetails(ration),
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
    nutrients,
  };
}
