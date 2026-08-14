import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";

const columns: Record<string, { name: string; label: string }[]> = {
  customers: [
    { name: "name", label: "Клиент" },
    { name: "email", label: "Email" },
    { name: "phone", label: "Телефон" },
    { name: "petsCount", label: "Питомцев" },
  ],
  pets: [
    { name: "name", label: "Питомец" },
    { name: "species", label: "Вид" },
    { name: "actualWeight", label: "Вес, кг" },
    { name: "idealWeight", label: "Идеальный вес" },
    { name: "bcs", label: "BCS" },
  ],
  products: [
    { name: "name", label: "Продукт" },
    { name: "kind", label: "Тип" },
    { name: "groupName", label: "Группа" },
    { name: "calories", label: "ккал / 100 г" },
    { name: "protein", label: "Белок" },
    { name: "fat", label: "Жир" },
  ],
  nutrients: [
    { name: "code", label: "Код" },
    { name: "name", label: "Нутриент" },
    { name: "category", label: "Группа" },
    { name: "unit", label: "Ед." },
  ],
  rations: [
    { name: "name", label: "Рацион" },
    { name: "petName", label: "Питомец" },
    { name: "mode", label: "Режим" },
    { name: "targetEnergy", label: "Цель, ккал" },
    { name: "updatedAt", label: "Изменён" },
  ],
  notifications: [
    { name: "createdAt", label: "Дата" },
    { name: "title", label: "Событие" },
    { name: "body", label: "Описание" },
    { name: "status", label: "Статус" },
  ],
  invoices: [
    { name: "number", label: "Номер" },
    { name: "description", label: "Назначение" },
    { name: "amount", label: "Сумма" },
    { name: "status", label: "Статус" },
  ],
  standards: [
    { name: "nameRu", label: "Порода" },
    { name: "speciesLabel", label: "Вид" },
    { name: "maleWeight", label: "Самец, кг" },
    { name: "femaleWeight", label: "Самка, кг" },
    { name: "standardStatus", label: "Эталон" },
  ],
};

function page<T extends Record<string, unknown>>(
  rows: T[],
  request: Request,
  resource: string,
) {
  const url = new URL(request.url);
  const p = Math.max(1, Number(url.searchParams.get("page")) || 1),
    per = Math.max(1, Number(url.searchParams.get("per_page")) || 20),
    search = (url.searchParams.get("search") ?? "").toLowerCase(),
    sort = url.searchParams.get("sort_col"),
    dir = url.searchParams.get("sort_dir") === "desc" ? -1 : 1;
  const searchFields =
    resource === "customers" ? ["name", "email", "phone"] : undefined;
  let result = search
    ? rows.filter((r) =>
        (searchFields ?? Object.keys(r)).some((field) =>
          String(r[field] ?? "")
            .toLowerCase()
            .includes(search),
        ),
      )
    : rows;
  if (sort)
    result = [...result].sort(
      (a, b) =>
        String(a[sort] ?? "").localeCompare(String(b[sort] ?? "")) * dir,
    );
  return Response.json({
    rows: result.slice((p - 1) * per, p * per),
    total: result.length,
    page: p,
    per_page: per,
    columns: columns[resource] ?? [],
  });
}

export async function listWorkspace(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
  const user = await requireUser(request);
  const { resource } = await params;
  if (resource === "customers") {
    const rows = await prisma.customer.findMany({
      where: { userId: user.id },
      include: { _count: { select: { pets: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return page(
      rows.map((r) => ({ ...r, petsCount: r._count.pets })),
      request,
      resource,
    );
  }
  if (resource === "pets") {
    return page(
      await prisma.pet.findMany({
        where: { userId: user.id },
        include: { breed: true, customer: true },
        orderBy: { updatedAt: "desc" },
      }),
      request,
      resource,
    );
  }
  if (resource === "products") {
    const rows = await prisma.product.findMany({
      where: { userId: user.id },
      include: { group: true, measures: true },
      orderBy: { name: "asc" },
    });
    return page(
      rows.map((r) => ({ ...r, groupName: r.group?.name ?? "—" })),
      request,
      resource,
    );
  }
  if (resource === "nutrients")
    return page(
      await prisma.nutrient.findMany({
        where: { userId: user.id },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
      request,
      resource,
    );
  if (resource === "rations") {
    const rows = await prisma.ration.findMany({
      where: { userId: user.id },
      include: { pet: true, items: { include: { product: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return page(
      rows.map((r) => ({ ...r, petName: r.pet?.name ?? "—" })),
      request,
      resource,
    );
  }
  if (resource === "notifications") {
    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return page(
      rows.map((r) => ({ ...r, status: r.readAt ? "Прочитано" : "Новое" })),
      request,
      resource,
    );
  }
  if (resource === "invoices")
    return page(
      await prisma.invoice.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      request,
      resource,
    );
  if (resource === "groups")
    return Response.json(
      await prisma.productGroup.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    );
  if (resource === "standards") {
    const breeds = await prisma.breed.findMany({
      include: { standards: { where: { userId: user.id }, select: { sex: true, idealWeight: true } } },
      orderBy: [{ species: "asc" }, { nameRu: "asc" }],
    });
    return page(breeds.map((breed) => {
      const male = breed.standards.find((item) => item.sex === "MALE");
      const female = breed.standards.find((item) => item.sex === "FEMALE");
      return {
        id: breed.id,
        nameRu: breed.nameRu,
        speciesLabel: breed.species === "DOG" ? "Собака" : "Кошка",
        maleWeight: male?.idealWeight ?? breed.maleIdealWeight,
        femaleWeight: female?.idealWeight ?? breed.femaleIdealWeight,
        standardStatus: male || female ? "Изменён врачом" : "Базовый",
      };
    }), request, resource);
  }
  return Response.json({ message: "Unknown resource" }, { status: 404 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function createWorkspace(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
  const user = await requireUser(request, { csrf: true });
  const { resource } = await params;
  const b = await request.json();
  if (resource === "products" && b.groupId) {
    const group = await prisma.productGroup.findFirst({ where: { id: b.groupId, userId: user.id }, select: { id: true } });
    if (!group) return Response.json({ error: "Группа не найдена" }, { status: 404 });
  }
  if (resource === "rations" && b.petId) {
    const pet = await prisma.pet.findFirst({ where: { id: b.petId, userId: user.id }, select: { id: true } });
    if (!pet) return Response.json({ error: "Питомец не найден" }, { status: 404 });
  }
  if (resource === "groups" && b.parentId) {
    const parent = await prisma.productGroup.findFirst({ where: { id: b.parentId, userId: user.id }, select: { id: true } });
    if (!parent) return Response.json({ error: "Родительская группа не найдена" }, { status: 404 });
  }
  if (resource === "customers")
    return Response.json(
      await prisma.customer.create({
        data: {
          name: b.name,
          email: b.email || null,
          phone: b.phone || null,
          note: b.note || null,
          userId: user.id,
        },
      }),
      { status: 201 },
    );
  if (resource === "products")
    return Response.json(
      await prisma.product.create({
        data: {
          name: b.name,
          kind: b.kind,
          groupId: b.groupId || null,
          calories: +b.calories || 0,
          protein: +b.protein || 0,
          fat: +b.fat || 0,
          carbs: +b.carbs || 0,
          userId: user.id,
        },
      }),
      { status: 201 },
    );
  if (resource === "nutrients")
    return Response.json(
      await prisma.nutrient.create({
        data: {
          code: b.code,
          name: b.name,
          category: b.category,
          unit: b.unit,
          userId: user.id,
        },
      }),
      { status: 201 },
    );
  if (resource === "rations")
    return Response.json(
      await prisma.ration.create({
        data: {
          name: b.name,
          petId: b.petId || null,
          mode: b.mode ?? "DAILY",
          targetEnergy: +b.targetEnergy || 0,
          note: b.note || null,
          userId: user.id,
        },
      }),
      { status: 201 },
    );
  if (resource === "notifications")
    return Response.json(
      await prisma.notification.create({
        data: { title: b.title, body: b.body, userId: user.id },
      }),
      { status: 201 },
    );
  if (resource === "groups")
    return Response.json(
      await prisma.productGroup.create({
        data: { name: b.name, parentId: b.parentId || null, userId: user.id },
      }),
      { status: 201 },
    );
  return Response.json({ message: "Unknown resource" }, { status: 404 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function mutateWorkspace(
  request: Request,
  { params }: { params: Promise<{ resource: string; id: string }> },
) {
  try {
  const user = await requireUser(request, { csrf: true });
  const { resource, id } = await params;
  const b = request.method === "DELETE" ? {} : await request.json();
  if (request.method === "DELETE") {
    if (resource === "customers")
      await prisma.customer.deleteMany({ where: { id, userId: user.id } });
    else if (resource === "products")
      await prisma.product.deleteMany({ where: { id, userId: user.id } });
    else if (resource === "nutrients")
      await prisma.nutrient.deleteMany({ where: { id, userId: user.id } });
    else if (resource === "rations")
      await prisma.ration.deleteMany({ where: { id, userId: user.id } });
    else if (resource === "notifications")
      await prisma.notification.deleteMany({ where: { id, userId: user.id } });
    else return Response.json({ message: "Unknown resource" }, { status: 404 });
    return new Response(null, { status: 204 });
  }
  if (resource === "notifications")
    {
      const updated = await prisma.notification.updateMany({
        where: { id, userId: user.id }, data: { readAt: b.read ? new Date() : null },
      });
      if (!updated.count) return Response.json({ error: "Запись не найдена" }, { status: 404 });
      return Response.json(await prisma.notification.findFirst({ where: { id, userId: user.id } }));
    }
  return Response.json({ message: "Unsupported mutation" }, { status: 400 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
