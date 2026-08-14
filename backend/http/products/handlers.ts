import { z } from "zod";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

const productSchema = z.object({
  name: z.string().trim().min(1).max(180),
  kind: z.enum(["PRODUCT", "SUPPLEMENT", "RECIPE"]),
  groupId: z.string().trim().nullable(),
  baseQuantity: z.coerce.number().positive().max(100000),
  unit: z.string().trim().min(1).max(20),
  calories: z.coerce.number().min(0).max(100000),
  protein: z.coerce.number().min(0).max(100000),
  fat: z.coerce.number().min(0).max(100000),
  carbs: z.coerce.number().min(0).max(100000),
  archived: z.boolean(),
  tagIds: z.array(z.string().trim().min(1)).max(30),
});

const nutrientSchema = z.object({
  nutrientId: z.string().trim().min(1),
  amount: z.coerce.number().min(0).max(1_000_000_000),
});

const measureSchema = z.object({
  name: z.string().trim().min(1).max(40),
  grams: z.coerce.number().positive().max(100000),
});

type ProductContext = { params: Promise<{ id: string }> };
type NutrientContext = { params: Promise<{ id: string; nutrientId: string }> };
type MeasureContext = { params: Promise<{ id: string; measureId: string }> };

async function ownedProduct(id: string, userId: string) {
  return prisma.product.findFirst({ where: { id, userId }, select: { id: true } });
}

async function nutrientValue(productId: string, nutrientId: string) {
  return prisma.productNutrient.findUnique({
    where: { productId_nutrientId: { productId, nutrientId } },
    include: { nutrient: true },
  });
}

export async function PATCH(request: Request, { params }: ProductContext) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id } = await params;
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте параметры продукта" }, { status: 400 });
    if (!(await ownedProduct(id, user.id))) return Response.json({ error: "Продукт не найден" }, { status: 404 });
    if (parsed.data.groupId) {
      const group = await prisma.productGroup.findFirst({ where: { id: parsed.data.groupId, userId: user.id }, select: { id: true } });
      if (!group) return Response.json({ error: "Группа не найдена" }, { status: 404 });
    }
    const { tagIds, ...productData } = parsed.data;
    const uniqueTagIds = [...new Set(tagIds)];
    if (uniqueTagIds.length) {
      const ownedTags = await prisma.productTag.count({ where: { id: { in: uniqueTagIds }, userId: user.id } });
      if (ownedTags !== uniqueTagIds.length) return Response.json({ error: "Один из тегов не найден" }, { status: 404 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({ where: { id }, data: productData });
      await tx.productTagLink.deleteMany({ where: { productId: id } });
      if (uniqueTagIds.length) {
        await tx.productTagLink.createMany({ data: uniqueTagIds.map((tagId) => ({ productId: id, tagId })) });
      }
      return product;
    });
    return Response.json({ ...updated, tagIds: uniqueTagIds });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST_NUTRIENT(request: Request, { params }: ProductContext) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id } = await params;
    const parsed = nutrientSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте нутриент и количество" }, { status: 400 });
    const [product, nutrient] = await Promise.all([
      ownedProduct(id, user.id),
      prisma.nutrient.findFirst({ where: { id: parsed.data.nutrientId, userId: user.id }, select: { id: true } }),
    ]);
    if (!product) return Response.json({ error: "Продукт не найден" }, { status: 404 });
    if (!nutrient) return Response.json({ error: "Нутриент не найден" }, { status: 404 });
    await prisma.productNutrient.upsert({
      where: { productId_nutrientId: { productId: id, nutrientId: parsed.data.nutrientId } },
      create: { productId: id, ...parsed.data },
      update: { amount: parsed.data.amount },
    });
    return Response.json(await nutrientValue(id, parsed.data.nutrientId), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH_NUTRIENT(request: Request, { params }: NutrientContext) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id, nutrientId } = await params;
    const amount = z.coerce.number().min(0).max(1_000_000_000).safeParse((await request.json()).amount);
    if (!amount.success) return Response.json({ error: "Проверьте количество" }, { status: 400 });
    if (!(await ownedProduct(id, user.id))) return Response.json({ error: "Продукт не найден" }, { status: 404 });
    const updated = await prisma.productNutrient.updateMany({
      where: { productId: id, nutrientId, nutrient: { userId: user.id } },
      data: { amount: amount.data },
    });
    if (!updated.count) return Response.json({ error: "Нутриент не найден в продукте" }, { status: 404 });
    return Response.json(await nutrientValue(id, nutrientId));
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE_NUTRIENT(request: Request, { params }: NutrientContext) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id, nutrientId } = await params;
    if (!(await ownedProduct(id, user.id))) return Response.json({ error: "Продукт не найден" }, { status: 404 });
    const deleted = await prisma.productNutrient.deleteMany({
      where: { productId: id, nutrientId, nutrient: { userId: user.id } },
    });
    if (!deleted.count) return Response.json({ error: "Нутриент не найден в продукте" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST_MEASURE(request: Request, { params }: ProductContext) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id } = await params;
    const parsed = measureSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте название и вес меры" }, { status: 400 });
    if (!(await ownedProduct(id, user.id))) return Response.json({ error: "Продукт не найден" }, { status: 404 });
    const duplicate = await prisma.productMeasure.findFirst({
      where: { productId: id, name: { equals: parsed.data.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) return Response.json({ error: "Такая мера уже добавлена" }, { status: 409 });
    const measure = await prisma.productMeasure.create({ data: { productId: id, ...parsed.data } });
    return Response.json(measure, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH_MEASURE(request: Request, { params }: MeasureContext) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id, measureId } = await params;
    const parsed = measureSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте название и вес меры" }, { status: 400 });
    const existing = await prisma.productMeasure.findFirst({
      where: { id: measureId, productId: id, product: { userId: user.id } },
      select: { id: true },
    });
    if (!existing) return Response.json({ error: "Мера не найдена" }, { status: 404 });
    const duplicate = await prisma.productMeasure.findFirst({
      where: { productId: id, id: { not: measureId }, name: { equals: parsed.data.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) return Response.json({ error: "Такая мера уже добавлена" }, { status: 409 });
    const measure = await prisma.$transaction(async (tx) => {
      const updated = await tx.productMeasure.update({ where: { id: measureId }, data: parsed.data });
      const rationItems = await tx.rationItem.findMany({ where: { measureId }, select: { id: true, quantity: true } });
      await Promise.all(rationItems.map((item) => tx.rationItem.update({
        where: { id: item.id },
        data: { grams: item.quantity * updated.grams },
      })));
      return updated;
    });
    return Response.json(measure);
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE_MEASURE(request: Request, { params }: MeasureContext) {
  try {
    const user = await requireUser(request, { csrf: true });
    const { id, measureId } = await params;
    const deleted = await prisma.productMeasure.deleteMany({
      where: { id: measureId, productId: id, product: { userId: user.id } },
    });
    if (!deleted.count) return Response.json({ error: "Мера не найдена" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
