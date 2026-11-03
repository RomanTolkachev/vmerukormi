import "server-only";
import type { Prisma } from "@prisma/client";
import type { RationDetails } from "@/entities/ration";

export const rationDetailsInclude = {
  pet: { include: { customer: { select: { name: true } } } },
  calculation: { include: { pet: { select: { name: true } }, module: { select: { name: true } }, nutrients: { include: { nutrient: true } } } },
} satisfies Prisma.RationInclude;

export function serializeRationDetails(ration: Prisma.RationGetPayload<{ include: typeof rationDetailsInclude }>): RationDetails {
  return {
    id: ration.id,
    name: ration.name,
    petId: ration.petId,
    customerId: ration.pet?.customerId ?? null,
    calculationId: ration.calculationId,
    mode: ration.mode,
    targetEnergy: ration.targetEnergy,
    tolerancePercent: ration.tolerancePercent,
    note: ration.note,
    createdAt: ration.createdAt.toISOString(),
    updatedAt: ration.updatedAt.toISOString(),
    pet: ration.pet ? { id: ration.pet.id, name: ration.pet.name, customerName: ration.pet.customer?.name ?? null } : null,
    calculation: ration.calculation ? {
      id: ration.calculation.id,
      petId: ration.calculation.petId,
      petName: ration.calculation.pet?.name ?? null,
      moduleName: ration.calculation.module.name,
      createdAt: ration.calculation.createdAt.toISOString(),
      adjustedEnergy: ration.calculation.adjustedEnergy,
      protein: ration.calculation.protein,
      fat: ration.calculation.fat,
      carbs: ration.calculation.carbs,
      nutrients: ration.calculation.nutrients,
    } : null,
  };
}
