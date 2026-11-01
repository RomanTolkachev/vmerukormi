import { prisma } from "@backend/infrastructure/database/prisma";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { readableCatalog, catalogReferences } from "@backend/domain/catalog/access";

export async function getOptions(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  try {
    const user = await requireUser(request);
    const { entity } = await params;
    const query = new URL(request.url).searchParams;
    const id = query.get("id");
    const search = query.get("search")?.trim().slice(0, 180) ?? "";
    const text = { contains: search, mode: "insensitive" as const };
    const named = id ? { id } : { name: text };
    const scope = query.get("shared") === "true" ? catalogReferences(user.id, true) : readableCatalog(user.id);
    const species = query.get("species");
    const speciesFilter: { species?: "CAT" | "DOG" } = species === "CAT" || species === "DOG" ? { species } : {};
    let rows: { id: string; name?: string; nameRu?: string; [key: string]: unknown }[];
    switch (entity) {
      case "customers": rows = await prisma.customer.findMany({ where: { userId: user.id, ...named }, take: 30, orderBy: { name: "asc" } }); break;
      case "pets": rows = await prisma.pet.findMany({ where: { userId: user.id, ...named, ...speciesFilter, ...(query.has("customerId") ? { customerId: query.get("customerId") || null } : {}) }, include: { breed: true, customer: true }, take: 30, orderBy: { name: "asc" } }); break;
      case "products": rows = await prisma.product.findMany({ where: { ...scope, ...named, archived: false }, include: { measures: true, nutrients: { where: { nutrient: { isReferenceOnly: false } }, include: { nutrient: true } } }, take: 30, orderBy: { name: "asc" } }); break;
      case "groups": rows = await prisma.productGroup.findMany({ where: { ...scope, ...named }, take: 30, orderBy: { name: "asc" } }); break;
      case "tags": rows = await prisma.productTag.findMany({ where: { ...scope, ...named }, take: 30, orderBy: { name: "asc" } }); break;
      case "nutrients": rows = await prisma.nutrient.findMany({ where: { ...scope, ...named, isReferenceOnly: false }, take: 30, orderBy: { name: "asc" } }); break;
      case "breeds": rows = await prisma.breed.findMany({ where: { ...speciesFilter, ...(id ? { id } : { nameRu: text }) }, take: 30, orderBy: { nameRu: "asc" } }); break;
      case "modules": rows = await prisma.module.findMany({ where: { ...named, ...speciesFilter, archived: false }, include: { versions: { where: { techBegin: { lte: new Date() }, techEnd: { gt: new Date() } }, take: 1 } }, take: 30, orderBy: { name: "asc" } }); break;
      case "calculations": rows = (await prisma.calculation.findMany({ where: { userId: user.id, ...(id ? { id } : { OR: [{ module: { name: text } }, { pet: { name: text } }] }), ...(query.get("petId") ? { petId: query.get("petId") } : {}) }, include: { module: true, pet: true, nutrients: { where: { nutrient: { isReferenceOnly: false } }, include: { nutrient: true } } }, take: 30, orderBy: { createdAt: "desc" } })).map(row => ({ ...row, name: `${row.module.name} · ${row.createdAt.toLocaleDateString("ru-RU")}`, moduleName: row.module.name, petName: row.pet?.name ?? null })); break;
      default: return Response.json({ error: "Справочник не найден" }, { status: 404 });
    }
    return Response.json(rows.map(row => ({ value: row.id, label: row.name ?? row.nameRu ?? row.id, data: row })));
  } catch (error) { return authErrorResponse(error); }
}
