import "server-only";

import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

async function getUserId() {
  return (await getCurrentUser())?.id ?? null;
}

export async function getCustomerHeader(id: string) {
  const userId = await getUserId();
  if (!userId) return null;
  return prisma.customer.findFirst({
    where: { id, userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { pets: true } },
    },
  });
}

export async function getCustomerPets(customerId: string) {
  const userId = await getUserId();
  if (!userId) return [];
  return prisma.pet.findMany({
    where: { customerId, userId },
    include: {
      breed: { select: { nameRu: true } },
      _count: { select: { calculations: true, rations: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCustomerCalculations(customerId: string) {
  const userId = await getUserId();
  if (!userId) return [];
  return prisma.calculation.findMany({
    where: { userId, pet: { customerId, userId } },
    include: {
      pet: { select: { id: true, name: true } },
      module: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerRations(customerId: string) {
  const userId = await getUserId();
  if (!userId) return [];
  return prisma.ration.findMany({
    where: { userId, pet: { customerId, userId } },
    include: {
      pet: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

