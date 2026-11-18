import { z } from "zod";
import { readableCatalog } from "@backend/domain/catalog/access";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

const sexStandard = z.object({
  sex: z.enum(["MALE", "FEMALE"]),
  idealWeight: z.coerce.number().positive().max(200),
  proteinPer1000Kcal: z.coerce.number().min(0).max(1000),
  fatPer1000Kcal: z.coerce.number().min(0).max(1000),
  carbsPer1000Kcal: z.coerce.number().min(0).max(1000),
  source: z.string().trim().max(500).optional(),
  nutrients: z.array(z.object({ nutrientId: z.string(), amountPer1000Kcal: z.coerce.number().min(0).max(100000000) })),
});
const schema = z.object({ userId: z.string().min(1).optional(), standards: z.array(sexStandard).length(2) });

export async function PUT(request: Request, { params }: { params: Promise<{ breedId: string }> }) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { breedId } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте эталонные значения" }, { status: 400 });
    const userId = parsed.data.userId ?? user.id;
    if (userId !== user.id && user.role !== "ADMIN") return Response.json({ error: "Чужие эталоны недоступны" }, { status: 403 });
    if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) return Response.json({ error: "Пользователь не найден" }, { status: 404 });
    if (await prisma.breedStandard.count({ where: { userId, breedId, deletedAt: { not: null } } })) return Response.json({ error: "Сначала восстановите эталоны в удалённых записях" }, { status: 409 });
    const breed = await prisma.breed.findUnique({ where: { id: breedId }, select: { id: true } });
    if (!breed) return Response.json({ error: "Порода не найдена" }, { status: 404 });
    const nutrientIds = [...new Set(parsed.data.standards.flatMap((item) => item.nutrients.map((value) => value.nutrientId)))];
    const ownedNutrients = await prisma.nutrient.count({ where: { ...readableCatalog(userId), isReferenceOnly: false, id: { in: nutrientIds } } });
    if (ownedNutrients !== nutrientIds.length) return Response.json({ error: "Часть нутриентов не найдена" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      for (const input of parsed.data.standards) {
        const standard = await tx.breedStandard.upsert({
          where: { userId_breedId_sex: { userId, breedId, sex: input.sex } },
          update: { idealWeight: input.idealWeight, proteinPer1000Kcal: input.proteinPer1000Kcal, fatPer1000Kcal: input.fatPer1000Kcal, carbsPer1000Kcal: input.carbsPer1000Kcal, source: input.source || null },
          create: { userId, breedId, sex: input.sex, idealWeight: input.idealWeight, proteinPer1000Kcal: input.proteinPer1000Kcal, fatPer1000Kcal: input.fatPer1000Kcal, carbsPer1000Kcal: input.carbsPer1000Kcal, source: input.source || null },
        });
        await tx.breedStandardNutrient.deleteMany({ where: { standardId: standard.id, nutrient: { isReferenceOnly: false } } });
        for (const value of input.nutrients) await tx.breedStandardNutrient.upsert({ where: { standardId_nutrientId: { standardId: standard.id, nutrientId: value.nutrientId } }, create: { standardId: standard.id, ...value }, update: { amountPer1000Kcal: value.amountPer1000Kcal, deletedAt: null, deletedById: null } });
      }
    });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
