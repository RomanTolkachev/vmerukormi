import { z } from "zod";
import { setProductDeleted } from "@backend/application/products/versions";
import { authErrorResponse, requireUser, type AuthUser } from "@backend/auth/session";
import { ownerScope } from "@backend/domain/accounts/policy";
import { writableCatalog } from "@backend/domain/catalog/access";
import { prisma } from "@backend/infrastructure/database/prisma";

type Descriptor = { model: string; label: string; keys: string[]; scope: (user: AuthUser) => Record<string, unknown>; admin?: boolean; parent?: { field: string; model: string } };
const own = ownerScope;
const catalog = writableCatalog;
const root = (model: string, label: string, scope = own): Descriptor => ({ model, label, keys: ["id"], scope });
const resources: Record<string, Descriptor> = {
  customers: root("customer", "Клиенты"), pets: root("pet", "Питомцы"), rations: root("ration", "Рационы"),
  calculations: root("calculation", "Расчёты"), notifications: root("notification", "Уведомления"), invoices: root("invoice", "Счета"),
  products: { ...root("product", "Продукты"), scope: catalog }, groups: { ...root("productGroup", "Группы"), scope: catalog },
  tags: { ...root("productTag", "Теги"), scope: catalog },
  nutrients: { ...root("nutrient", "Нутриенты"), scope: () => ({}), admin: true },
  modules: { ...root("module", "Формулы"), scope: () => ({}), admin: true },
  breeds: { ...root("breed", "Породы"), scope: () => ({}), admin: true },
  versions: { ...root("moduleFormulaVersion", "Версии формул"), scope: () => ({}), admin: true, parent: { field: "moduleId", model: "module" } },
  standards: root("breedStandard", "Эталоны"),
  measurements: { ...root("petMeasurement", "Измерения"), scope: user => ({ pet: own(user) }), parent: { field: "petId", model: "pet" } },
  items: { ...root("rationItem", "Позиции рационов"), scope: user => ({ ration: own(user) }), parent: { field: "rationId", model: "ration" } },
  measures: { ...root("productMeasure", "Меры продуктов"), scope: user => ({ product: catalog(user) }), parent: { field: "productId", model: "product" } },
  composition: { model: "productNutrient", label: "Состав продуктов", keys: ["productId", "nutrientId"], scope: user => ({ product: catalog(user) }), parent: { field: "productId", model: "product" } },
  "product-tags": { model: "productTagLink", label: "Теги продуктов", keys: ["productId", "tagId"], scope: user => ({ product: catalog(user) }), parent: { field: "productId", model: "product" } },
  "standard-nutrients": { model: "breedStandardNutrient", label: "Нутриенты эталонов", keys: ["standardId", "nutrientId"], scope: user => ({ standard: own(user) }), parent: { field: "standardId", model: "breedStandard" } },
  "calculation-nutrients": { model: "calculationNutrient", label: "Нутриенты расчётов", keys: ["calculationId", "nutrientId"], scope: user => ({ calculation: own(user) }), parent: { field: "calculationId", model: "calculation" } },
};
type Row = Record<string, unknown>;
type Delegate = {
  findMany: (args: Row) => Promise<Row[]>;
  findFirst: (args: Row) => Promise<Row | null>;
  count: (args: Row) => Promise<number>;
  updateMany: (args: Row) => Promise<{ count: number }>;
};
function delegate(model: string) { return (prisma as unknown as Record<string, Delegate>)[model]; }

export async function listArchive(request: Request) {
  try {
    const user = await requireUser(request);
    const query = new URL(request.url).searchParams;
    const resource = query.get("resource") ?? "products";
    const descriptor = Object.hasOwn(resources, resource) ? resources[resource] : undefined;
    if (!descriptor || (descriptor.admin && user.role !== "ADMIN")) return Response.json({ error: "Раздел недоступен" }, { status: 403 });
    const page = Math.min(1_000_000, Math.max(1, Math.floor(Number(query.get("page")) || 1)));
    const perPage = Math.min(100, Math.max(1, Math.floor(Number(query.get("per_page")) || 25)));
    const where = { ...descriptor.scope(user), deletedAt: { not: null } };
    const [records, total] = await Promise.all([
      delegate(descriptor.model).findMany({ where, take: perPage, skip: (page - 1) * perPage, orderBy: { deletedAt: "desc" } }),
      delegate(descriptor.model).count({ where }),
    ]);
    const rows = records.map(record => ({
      id: JSON.stringify(Object.fromEntries(descriptor.keys.map(key => [key, record[key]]))),
      name: record.name ?? record.title ?? record.number ?? record.productId ?? record.breedId ?? record.id,
      deletedAt: record.deletedAt, deletedById: record.deletedById, userId: record.userId ?? null,
    }));
    return Response.json({ rows, total, page, per_page: perPage, resources: Object.entries(resources).filter(([, entry]) => !entry.admin || user.role === "ADMIN").map(([value, entry]) => ({ value, label: entry.label })), columns: [
      { name: "name", label: "Запись" }, { name: "deletedAt", label: "Удалена" }, { name: "deletedById", label: "Кто удалил" },
    ] });
  } catch (error) { return authErrorResponse(error); }
}

export async function restoreRecord(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    const parsed = z.object({ resource: z.string(), key: z.record(z.string(), z.string()) }).safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте запись" }, { status: 400 });
    const descriptor = Object.hasOwn(resources, parsed.data.resource) ? resources[parsed.data.resource] : undefined;
    if (!descriptor || (descriptor.admin && user.role !== "ADMIN")) return Response.json({ error: "Восстановление недоступно" }, { status: 403 });
    if (Object.keys(parsed.data.key).length !== descriptor.keys.length || descriptor.keys.some(key => !parsed.data.key[key])) return Response.json({ error: "Некорректный идентификатор" }, { status: 400 });
    const where = { ...parsed.data.key, ...descriptor.scope(user), deletedAt: { not: null } };
    const record = await delegate(descriptor.model).findFirst({ where });
    if (!record) return Response.json({ error: "Запись не найдена" }, { status: 404 });
    if (descriptor.parent && !(await delegate(descriptor.parent.model).findFirst({ where: { id: record[descriptor.parent.field] } }))) {
      return Response.json({ error: "Сначала восстановите родительскую запись" }, { status: 409 });
    }
    if (["measures", "composition", "product-tags"].includes(parsed.data.resource)) return Response.json({ error: "Восстановите состав через историю версий в карточке продукта" }, { status: 409 });
    if (parsed.data.resource === "products") await setProductDeleted(parsed.data.key.id, user, false);
    else await delegate(descriptor.model).updateMany({ where, data: { deletedAt: null, deletedById: null } });
    return Response.json({ ok: true });
  } catch (error) { return authErrorResponse(error); }
}
