import { z } from "zod";
import { readableCatalog } from "@backend/domain/catalog/access";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

const itemSchema = z.object({
  productId: z.string().trim().min(1),
  measureId: z.string().trim().nullable().optional(),
  quantity: z.coerce.number().positive().max(100000),
  day: z.coerce.number().int().min(1).max(7).default(1),
  enabled: z.boolean().default(true),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id } = await params;
    const parsed = itemSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Проверьте количество и продукт" }, { status: 400 });
    }
    const [ration, product] = await Promise.all([
      prisma.ration.findFirst({
        where: { id, userId: user.id },
        select: { id: true, mode: true },
      }),
      prisma.product.findFirst({
        where: { id: parsed.data.productId, ...readableCatalog(user.id), archived: false },
        include: { measures: true },
      }),
    ]);
    if (!ration) return Response.json({ error: "Рацион не найден" }, { status: 404 });
    if (!product) return Response.json({ error: "Продукт не найден" }, { status: 404 });

    const measure = parsed.data.measureId
      ? product.measures.find((item) => item.id === parsed.data.measureId)
      : null;
    if (parsed.data.measureId && !measure) {
      return Response.json({ error: "Мера не относится к продукту" }, { status: 400 });
    }
    const quantity = parsed.data.quantity;
    const item = await prisma.rationItem.create({
      data: {
        rationId: ration.id,
        productId: product.id,
        measureId: measure?.id ?? null,
        quantity,
        grams: measure ? measure.grams * quantity : quantity,
        day: ration.mode === "DAILY" ? 1 : parsed.data.day,
        enabled: parsed.data.enabled,
      },
      include: {
        measure: true,
        product: {
          include: { measures: true, nutrients: { where: { nutrient: { isReferenceOnly: false } }, include: { nutrient: true } } },
        },
      },
    });
    return Response.json(item, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
