import { z } from "zod";
import { readableCatalog } from "@backend/domain/catalog/access";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

const patchSchema = z
  .object({
    productId: z.string().trim().min(1).optional(),
    measureId: z.string().trim().nullable().optional(),
    quantity: z.coerce.number().positive().max(100000).optional(),
    day: z.coerce.number().int().min(1).max(7).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

type Context = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id, itemId } = await params;
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Проверьте параметры позиции" }, { status: 400 });
    }
    const existing = await prisma.rationItem.findFirst({
      where: { id: itemId, rationId: id, ration: { userId: user.id } },
      include: { ration: { select: { mode: true } } },
    });
    if (!existing) return Response.json({ error: "Позиция не найдена" }, { status: 404 });

    const productId = parsed.data.productId ?? existing.productId;
    const product = await prisma.product.findFirst({
      where: { id: productId, ...readableCatalog(user.id), archived: false },
      include: { measures: true },
    });
    if (!product) return Response.json({ error: "Продукт не найден" }, { status: 404 });

    const measureId =
      parsed.data.measureId !== undefined
        ? parsed.data.measureId
        : parsed.data.productId && parsed.data.productId !== existing.productId
          ? null
          : existing.measureId;
    const measure = measureId
      ? product.measures.find((item) => item.id === measureId)
      : null;
    if (measureId && !measure) {
      return Response.json({ error: "Мера не относится к продукту" }, { status: 400 });
    }
    const quantity = parsed.data.quantity ?? existing.quantity;
    const item = await prisma.rationItem.update({
      where: { id: itemId },
      data: {
        productId,
        measureId: measure?.id ?? null,
        quantity,
        grams: measure ? measure.grams * quantity : quantity,
        day:
          existing.ration.mode === "DAILY"
            ? 1
            : parsed.data.day ?? existing.day,
        enabled: parsed.data.enabled,
      },
      include: {
        measure: true,
        product: {
          include: { measures: true, nutrients: { where: { nutrient: { isReferenceOnly: false } }, include: { nutrient: true } } },
        },
      },
    });
    return Response.json(item);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id, itemId } = await params;
    const existing = await prisma.rationItem.findFirst({
      where: { id: itemId, rationId: id, ration: { userId: user.id } },
      select: { id: true },
    });
    if (!existing) return Response.json({ error: "Позиция не найдена" }, { status: 404 });
    await prisma.rationItem.delete({ where: { id: itemId } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
