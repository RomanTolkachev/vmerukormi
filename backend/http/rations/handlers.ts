import { z } from "zod";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";
import { rationDetailsInclude, serializeRationDetails } from "@backend/application/rations/ration-details";

const rationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  petId: z.string().trim().nullable().optional(),
  calculationId: z.string().trim().nullable().optional(),
  mode: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  targetEnergy: z.coerce.number().min(0).max(100000).optional(),
  tolerancePercent: z.coerce.number().min(0).max(100).default(10),
  note: z.string().trim().max(4000).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rations = await prisma.ration.findMany({
      where: { userId: user.id },
      include: {
        pet: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return Response.json(rations);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    const parsed = rationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Проверьте параметры рациона" }, { status: 400 });
    }

    const input = parsed.data;
    let targetEnergy = input.targetEnergy ?? 0;
    let petId = input.petId || null;
    if (input.calculationId) {
      const calculation = await prisma.calculation.findFirst({ where: { id: input.calculationId, userId: user.id }, select: { id: true, petId: true, adjustedEnergy: true } });
      if (!calculation) return Response.json({ error: "Расчёт не найден" }, { status: 404 });
      petId = calculation.petId;
      targetEnergy = input.targetEnergy ?? calculation.adjustedEnergy;
    } else if (input.petId) {
      const pet = await prisma.pet.findFirst({
        where: { id: input.petId, userId: user.id },
        select: {
          id: true,
          calculations: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { adjustedEnergy: true },
          },
        },
      });
      if (!pet) return Response.json({ error: "Питомец не найден" }, { status: 404 });
      if (input.targetEnergy === undefined) {
        targetEnergy = pet.calculations[0]?.adjustedEnergy ?? 0;
      }
    }

    const ration = await prisma.ration.create({
      data: {
        name: input.name,
        petId,
        calculationId: input.calculationId || null,
        mode: input.mode,
        targetEnergy,
        tolerancePercent: input.tolerancePercent,
        note: input.note || null,
        userId: user.id,
      },
      include: rationDetailsInclude,
    });
    return Response.json(serializeRationDetails(ration), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
