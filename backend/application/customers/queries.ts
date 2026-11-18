import "server-only";
import { ownerScope } from "@backend/domain/accounts/policy";

import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

export async function getCustomerHeader(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.customer.findFirst({
    where: { id, ...ownerScope(user) },
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
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.pet.findMany({
    where: { customerId, ...ownerScope(user) },
    include: {
      breed: { select: { nameRu: true } },
      _count: { select: { calculations: true, rations: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCustomerCalculations(customerId: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.calculation.findMany({
    where: { ...ownerScope(user), pet: { customerId, ...ownerScope(user) } },
    include: {
      pet: { select: { id: true, name: true } },
      module: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerRations(customerId: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.ration.findMany({
    where: { ...ownerScope(user), pet: { customerId, ...ownerScope(user) } },
    include: {
      pet: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

