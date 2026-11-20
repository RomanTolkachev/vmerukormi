import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma, auditEvent } from "@backend/infrastructure/database/prisma";
import type { AuthUser } from "@backend/auth/session";
import { readableCatalog, writableCatalog, catalogReferences, canEditCatalog } from "@backend/domain/catalog/access";
import { CatalogError, calculateRecipe, emptyProduct, recipeNutrientKey, type ProductDraft, type RecipeIngredient, type IngredientSnapshot } from "@backend/domain/catalog/recipe";

const nonnegative = z.number().finite().min(0).max(1_000_000_000);
const positive = z.number().finite().positive().max(1_000_000);
const ingredientSchema = z.object({ productId: z.string().min(1), grams: positive, sourceRevision: z.number().int().positive().optional() });
const writeSchema = z.object({
  name: z.string().trim().min(1).max(180), kind: z.enum(["PRODUCT", "SUPPLEMENT", "RECIPE"]).default("PRODUCT"),
  groupId: z.string().min(1).nullable().default(null), baseQuantity: positive.default(100), unit: z.string().trim().min(1).max(20).default("г"),
  calories: nonnegative.default(0), protein: nonnegative.default(0), fat: nonnegative.default(0), carbs: nonnegative.default(0),
  archived: z.boolean().default(false), tagIds: z.array(z.string().min(1)).max(30).default([]),
  nutrients: z.array(z.object({ nutrientId: z.string().min(1), amount: nonnegative.nullable() })).max(500).default([]),
  measures: z.array(z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(40), grams: positive })).max(50).default([]),
  recipeIngredients: z.array(ingredientSchema).max(100).default([]), recipeYieldGrams: positive.nullable().default(null),
  recipeInstructions: z.string().max(20000).default(""), recipeNotes: z.string().max(10000).default(""),
  expectedRevision: z.number().int().positive().optional(), recalculate: z.boolean().default(false),
});
const includeProduct = { nutrients: { where: { nutrient: { isReferenceOnly: false } }, include: { nutrient: true } }, measures: true, tags: { include: { tag: true } } } satisfies Prisma.ProductInclude;
type StoredProduct = Prisma.ProductGetPayload<{ include: typeof includeProduct }>;
type User = Pick<AuthUser, "id" | "role">;

function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
function fail(message: string, status = 409): never { throw new CatalogError(status, message); }
function unique(values: string[], label: string) { if (new Set(values).size !== values.length) fail(`Повторяется ${label}`, 400); }

export function productData(product: StoredProduct, user: User) {
  return {
    ...emptyProduct(), id: product.id, revision: product.revision, name: product.name, kind: product.kind,
    groupId: product.groupId, baseQuantity: product.baseQuantity, unit: product.unit,
    calories: product.calories, protein: product.protein, fat: product.fat, carbs: product.carbs,
    archived: product.archived, isShared: product.isShared, deletedAt: product.deletedAt?.toISOString() ?? null,
    source: product.source, sourceExternalId: product.sourceExternalId,
    canEdit: !product.deletedAt && canEditCatalog(product, user), canViewHistory: canEditCatalog(product, user),
    tagIds: product.tags.map(value => value.tagId),
    tagNames: Object.fromEntries(product.tags.map(value => [value.tagId, value.tag.name])),
    measures: product.measures.map(({ id, name, grams }) => ({ id, name, grams })),
    nutrients: product.nutrients.map(({ nutrientId, amount, nutrient }) => ({ nutrientId, amount, nutrient: { id: nutrient.id, code: nutrient.code, name: nutrient.name, category: nutrient.category, unit: nutrient.unit } })),
    recipeIngredients: product.recipeIngredients as unknown as RecipeIngredient[], recipeYieldGrams: product.recipeYieldGrams,
    recipeInstructions: product.recipeInstructions ?? "", recipeNotes: product.recipeNotes ?? "",
  };
}

export async function readProduct(id: string, user: User) {
  const product = await prisma.product.findFirst({ where: { id, deletedAt: {}, ...readableCatalog(user) }, include: includeProduct });
  if (!product) fail("Продукт не найден", 404);
  return productData(product, user);
}

async function lockProduct(id: string, user: User, allowDeleted = false) {
  await prisma.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
  const product = await prisma.product.findFirst({ where: { id, ...(allowDeleted ? { deletedAt: {} } : {}), ...writableCatalog(user) }, include: includeProduct });
  if (!product) fail("Запись недоступна для изменения", 404);
  return product;
}

export async function recordProductVersion(id: string, user: User, action: string) {
  const previous = await prisma.productVersion.findFirst({ where: { productId: id, busEnd: null } });
  const moment = new Date(Math.max(Date.now(), previous ? previous.busBegin.getTime() + 1 : 0));
  if (previous) await prisma.productVersion.update({ where: { id: previous.id }, data: { busEnd: moment } });
  const product = await prisma.product.findFirstOrThrow({ where: { id, deletedAt: {} }, include: includeProduct });
  const { canEdit, canViewHistory, ...snapshot } = productData(product, user);
  void canEdit; void canViewHistory;
  await prisma.productVersion.create({ data: { productId: id, revision: product.revision, busBegin: moment, actorId: user.id, action, snapshot: json(snapshot) } });
  return productData(product, user);
}

async function ingredientsFor(input: z.infer<typeof ingredientSchema>[], user: User, shared: boolean, ownId?: string, checkRevision = false, ownerId = user.id): Promise<RecipeIngredient[]> {
  unique(input.map(value => value.productId), "ингредиент");
  const result: RecipeIngredient[] = [];
  if (input.some(value => value.productId === ownId)) fail("Нельзя добавить рецепт в самого себя", 400);
  if (input.length) await prisma.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE id IN (${Prisma.join(input.map(value => value.productId).sort())}) ORDER BY id FOR SHARE`);
  const products = await prisma.product.findMany({ where: { id: { in: input.map(value => value.productId) }, archived: false, kind: { in: ["PRODUCT", "SUPPLEMENT"] }, ...catalogReferences({ id: ownerId, role: "USER" }, shared) }, include: includeProduct });
  for (const item of input) {
    const source = products.find(product => product.id === item.productId);
    if (!source || item.productId === ownId) fail("Ингредиент удалён, недоступен, архивный или стал рецептом. Замените или уберите его — пересчёт не выполнен.");
    if (checkRevision && item.sourceRevision !== source.revision) fail("Состав ингредиента изменился. Повторите пересчёт перед сохранением.");
    const data = productData(source, user);
    const snapshot: IngredientSnapshot = { id: data.id, name: data.name, kind: data.kind, revision: data.revision, baseQuantity: data.baseQuantity, unit: data.unit, calories: data.calories, protein: data.protein, fat: data.fat, carbs: data.carbs, nutrients: data.nutrients };
    result.push({ productId: item.productId, grams: item.grams, snapshot });
  }
  return result;
}

export async function previewRecipe(input: unknown, user: User) {
  const parsed = z.object({ id: z.string().optional(), isShared: z.boolean().default(false), recipeIngredients: z.array(ingredientSchema).max(100), recipeYieldGrams: positive.nullable() }).safeParse(input);
  if (!parsed.success) fail("Проверьте ингредиенты и массу блюда", 400);
  let shared = user.role === "ADMIN" ? parsed.data.isShared : false;
  let ownerId = user.id;
  if (parsed.data.id) {
    const product = await prisma.product.findFirst({ where: { id: parsed.data.id, ...writableCatalog(user) } });
    if (!product) fail("Рецепт недоступен", 404);
    shared = product.isShared;
    ownerId = product.userId;
  }
  const ingredients = await ingredientsFor(parsed.data.recipeIngredients, user, shared, parsed.data.id, false, ownerId);
  try { return { recipeIngredients: ingredients, ...calculateRecipe(ingredients, parsed.data.recipeYieldGrams) }; }
  catch (error) { fail(error instanceof Error ? error.message : "Не удалось пересчитать", 400); }
}

async function replaceDetails(id: string, draft: ProductDraft, user: User, restore = false) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });
  const scope = catalogReferences(user, product.isShared);
  unique(draft.tagIds, "тег"); unique(draft.nutrients.map(value => value.nutrientId), "нутриент");
  unique(draft.measures.map(value => value.name.toLowerCase()), "название меры");
  unique(draft.measures.map(value => value.id).filter(Boolean), "мера");
  if (draft.groupId && !await prisma.productGroup.findFirst({ where: { id: draft.groupId, ...scope } })) fail("Группа недоступна", 400);
  if (await prisma.productTag.count({ where: { id: { in: draft.tagIds }, ...scope } }) !== draft.tagIds.length) fail("Тег недоступен", 400);
  const nutrients = await prisma.nutrient.findMany({ where: { id: { in: draft.nutrients.map(value => value.nutrientId) }, ...scope, isReferenceOnly: false } });
  if (nutrients.length !== draft.nutrients.length) fail("Нутриент удалён или недоступен", 400);
  if (restore && draft.nutrients.some(value => nutrients.find(nutrient => nutrient.id === value.nutrientId)?.unit !== value.nutrient.unit)) fail("Единицы нутриентов изменились: автоматическое восстановление небезопасно");
  const previousMeasures = await prisma.productMeasure.findMany({ where: { productId: id, deletedAt: {} } });
  for (const measure of draft.measures) {
    if (measure.id && !previousMeasures.some(previous => previous.id === measure.id)) fail("Мера не принадлежит продукту", 400);
  }
  await prisma.productNutrient.deleteMany({ where: { productId: id, nutrientId: { notIn: draft.nutrients.map(value => value.nutrientId) } } });
  for (const value of draft.nutrients) await prisma.productNutrient.upsert({ where: { productId_nutrientId: { productId: id, nutrientId: value.nutrientId } }, create: { productId: id, nutrientId: value.nutrientId, amount: value.amount }, update: { amount: value.amount, deletedAt: null, deletedById: null } });
  await prisma.productTagLink.deleteMany({ where: { productId: id, tagId: { notIn: draft.tagIds } } });
  for (const tagId of draft.tagIds) await prisma.productTagLink.upsert({ where: { productId_tagId: { productId: id, tagId } }, create: { productId: id, tagId }, update: { deletedAt: null, deletedById: null } });
  await prisma.productMeasure.deleteMany({ where: { productId: id, id: { notIn: draft.measures.map(value => value.id).filter(Boolean) } } });
  for (const measure of draft.measures) {
    if (measure.id) await prisma.productMeasure.update({ where: { id: measure.id, deletedAt: {} }, data: { name: measure.name, grams: measure.grams, deletedAt: null, deletedById: null } });
    else await prisma.productMeasure.create({ data: { productId: id, name: measure.name, grams: measure.grams } });
  }
}

async function persistDraft(id: string, draft: ProductDraft) {
  const { nutrients, measures, tagIds, recipeIngredients, ...attributes } = draft;
  void nutrients; void measures; void tagIds;
  await prisma.product.update({ where: { id }, data: { ...attributes, recipeIngredients: json(recipeIngredients) } });
}

export async function saveProduct(input: unknown, user: User, id?: string) {
  const parsed = writeSchema.safeParse(input);
  if (!parsed.success) fail("Проверьте поля продукта: " + parsed.error.issues[0]?.path.join("."), 400);
  return prisma.$transaction(async () => {
    const current = id ? await lockProduct(id, user) : null;
    const data = parsed.data;
    if (current && data.expectedRevision !== current.revision) fail("Запись уже изменена. Обновите карточку, чтобы не затереть чужие изменения.");
    const shared = current?.isShared ?? user.role === "ADMIN";
    let ingredients = current?.recipeIngredients as unknown as RecipeIngredient[] ?? [];
    if (data.kind === "RECIPE") {
      if (data.baseQuantity !== 100 || data.unit !== "г") fail("Состав рецепта указывается на 100 г", 400);
      const changed = JSON.stringify(ingredients.map(value => [value.productId, value.grams, value.snapshot.revision])) !== JSON.stringify(data.recipeIngredients.map(value => [value.productId, value.grams, value.sourceRevision])) || current?.recipeYieldGrams !== data.recipeYieldGrams;
      if (changed || data.recalculate || !current) ingredients = await ingredientsFor(data.recipeIngredients, user, shared, id, !data.recalculate, current?.userId ?? user.id);
      if (ingredients.length && !data.recipeYieldGrams) fail("Укажите массу готового блюда", 400);
      try { calculateRecipe(ingredients, data.recipeYieldGrams); }
      catch (error) { fail(error instanceof Error ? error.message : "Проверьте состав рецепта", 400); }
    } else ingredients = [];
    const definitions = await prisma.nutrient.findMany({ where: { id: { in: data.nutrients.map(value => value.nutrientId) }, ...catalogReferences(user, shared), isReferenceOnly: false } });
    if (definitions.length !== data.nutrients.length) fail("Нутриент повторяется, удалён или недоступен", 400);
    let draft: ProductDraft = { ...data, measures: data.measures.map(value => ({ ...value, id: value.id ?? "" })), nutrients: data.nutrients.map(value => ({ ...value, nutrient: definitions.find(definition => definition.id === value.nutrientId)! })), recipeIngredients: ingredients };
    const { expectedRevision, recalculate, ...clean } = draft as ProductDraft & { expectedRevision?: number; recalculate?: boolean };
    void expectedRevision; void recalculate;
    draft = clean;
    if (data.recalculate && data.kind === "RECIPE") {
      const computed = calculateRecipe(ingredients, data.recipeYieldGrams);
      const extra = draft.nutrients.filter(value => !computed.nutrients.some(calculated => recipeNutrientKey(calculated.nutrient) === recipeNutrientKey(value.nutrient))).map(value => ({ ...value, amount: 0 }));
      draft = { ...draft, ...computed, nutrients: [...computed.nutrients, ...extra] };
    }
    if (draft.kind !== "RECIPE") draft = { ...draft, recipeYieldGrams: null, recipeIngredients: [], recipeInstructions: "", recipeNotes: "" };
    const productId = current?.id ?? (await prisma.product.create({ data: { name: draft.name, userId: user.id, isShared: shared } })).id;
    await replaceDetails(productId, draft, user);
    await persistDraft(productId, draft);
    if (current) await prisma.product.update({ where: { id: productId }, data: { revision: { increment: 1 } } });
    return recordProductVersion(productId, user, current ? "SAVE" : "CREATE");
  });
}

export async function productHistory(id: string, user: User, versionId?: string, page = 0) {
  if (!await prisma.product.findFirst({ where: { id, deletedAt: {}, ...writableCatalog(user) } })) fail("История недоступна", 404);
  if (versionId) {
    const version = await prisma.productVersion.findFirst({ where: { id: versionId, productId: id } });
    if (!version) fail("Версия не найдена", 404);
    return version;
  }
  return prisma.productVersion.findMany({ where: { productId: id }, orderBy: { revision: "desc" }, take: 30, skip: page * 30, select: { id: true, revision: true, busBegin: true, busEnd: true, action: true } });
}

export async function restoreProductVersion(id: string, versionId: string, revision: number, user: User) {
  return prisma.$transaction(async () => {
    const current = await lockProduct(id, user);
    if (current.revision !== revision) fail("Запись уже изменена. Обновите карточку.");
    const version = await prisma.productVersion.findFirst({ where: { id: versionId, productId: id } });
    if (!version) fail("Версия не найдена", 404);
    const saved = version.snapshot as unknown as ProductDraft & { deletedAt?: string | null };
    if (saved.deletedAt) fail("Выберите версию до удаления");
    const keys = Object.keys(emptyProduct()) as (keyof ProductDraft)[];
    const draft = Object.fromEntries(keys.map(key => [key, saved[key]])) as ProductDraft;
    await replaceDetails(id, draft, user, true);
    await persistDraft(id, draft);
    await prisma.product.update({ where: { id }, data: { revision: { increment: 1 } } });
    await auditEvent("RESTORE_VERSION", "Product", id, { fromVersion: version.revision });
    return recordProductVersion(id, user, `RESTORE:${version.revision}`);
  });
}

export async function setProductDeleted(id: string, user: User, deleted: boolean) {
  return prisma.$transaction(async () => {
    const product = await lockProduct(id, user, !deleted);
    if (Boolean(product.deletedAt) === deleted) fail("Состояние записи уже изменилось");
    if (deleted) await prisma.product.delete({ where: { id } });
    else await prisma.product.update({ where: { id, deletedAt: {} }, data: { deletedAt: null, deletedById: null } });
    await prisma.product.update({ where: { id, deletedAt: {} }, data: { revision: { increment: 1 } } });
    return recordProductVersion(id, user, deleted ? "DELETE" : "UNDELETE");
  });
}
