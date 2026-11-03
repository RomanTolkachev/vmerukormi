import "server-only";

import { getCurrentUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

export async function getPetCard(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.pet.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      species: true,
      sex: true,
      breedId: true,
      breed: true,
      customerId: true,
      customer: { select: { id: true, name: true } },
      actualWeight: true,
      idealWeight: true,
      bcs: true,
      note: true,
    },
  });
}
