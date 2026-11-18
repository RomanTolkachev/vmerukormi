import { authErrorResponse, requireAdmin, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

export async function listAudit(request: Request) {
  try {
    requireAdmin(await requireUser(request));
    const query = new URL(request.url).searchParams;
    const search = query.get("search")?.slice(0, 100) ?? "";
    const page = Math.min(1_000_000, Math.max(1, Math.floor(Number(query.get("page")) || 1)));
    const perPage = Math.min(100, Math.max(1, Math.floor(Number(query.get("per_page")) || 25)));
    const where = {
      ...(query.get("action") ? { action: query.get("action")! } : {}),
      OR: [{ actorEmail: { contains: search, mode: "insensitive" as const } }, { entityType: { contains: search, mode: "insensitive" as const } }, { entityId: { contains: search, mode: "insensitive" as const } }],
    };
    const [rows, total] = await Promise.all([
      prisma.auditEvent.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: perPage, skip: (page - 1) * perPage }),
      prisma.auditEvent.count({ where }),
    ]);
    return Response.json({ rows, total, page, per_page: perPage, columns: [
      { name: "createdAt", label: "Когда" }, { name: "actorEmail", label: "Пользователь" }, { name: "action", label: "Действие" }, { name: "entityType", label: "Тип записи" }, { name: "entityId", label: "Запись" },
    ] });
  } catch (error) { return authErrorResponse(error); }
}
