import { z } from "zod";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    petId: z.string().trim().nullable().optional(),
    mode: z.enum(["DAILY", "WEEKLY"]).optional(),
    targetEnergy: z.coerce.number().min(0).max(100000).optional(),
    note: z.string().trim().max(4000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const ration = await prisma.ration.findFirst({
      where: { id, userId: user.id },
      include: { pet: true, items: { include: { product: true, measure: true } } },
    });
    if (!ration) return Response.json({ error: "Рацион не найден" }, { status: 404 });
    return Response.json(ration);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Проверьте параметры рациона" }, { status: 400 });
    }
    const existing = await prisma.ration.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return Response.json({ error: "Рацион не найден" }, { status: 404 });

    if (parsed.data.petId) {
      const pet = await prisma.pet.findFirst({
        where: { id: parsed.data.petId, userId: user.id },
        select: { id: true },
      });
      if (!pet) return Response.json({ error: "Питомец не найден" }, { status: 404 });
    }

    const ration = await prisma.$transaction(async (tx) => {
      const updated = await tx.ration.update({
        where: { id },
        data: {
          ...parsed.data,
          petId: parsed.data.petId === undefined ? undefined : parsed.data.petId || null,
          note: parsed.data.note === undefined ? undefined : parsed.data.note || null,
        },
      });
      if (parsed.data.mode === "DAILY") {
        await tx.rationItem.updateMany({ where: { rationId: id }, data: { day: 1 } });
      }
      return updated;
    });
    return Response.json(ration);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id } = await params;
    const deleted = await prisma.ration.deleteMany({ where: { id, userId: user.id } });
    if (!deleted.count) return Response.json({ error: "Рацион не найден" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
