import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authErrorResponse, requireUser, requireAdmin } from "@backend/auth/session";
import { hashPassword } from "@backend/auth/password";
import { prisma } from "@backend/infrastructure/database/prisma";
import { accountSchema, emailSchema, passwordSchema } from "@backend/domain/accounts/validation";

const fields = { id: true, name: true, email: true, role: true, createdAt: true, deletedAt: true } as const;
const createSchema = accountSchema.extend({ role: z.enum(["ADMIN", "USER"]).default("USER") });
const editSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(), email: emailSchema.optional(),
  role: z.enum(["ADMIN", "USER"]).optional(), password: passwordSchema.optional(), restore: z.literal(true).optional(),
});

export async function listUsers(request: Request) {
  try {
    requireAdmin(await requireUser(request));
    const query = new URL(request.url).searchParams;
    const search = query.get("search")?.trim().slice(0, 100) ?? "";
    const page = Math.min(1_000_000, Math.max(1, Math.floor(Number(query.get("page")) || 1)));
    const perPage = Math.min(100, Math.max(1, Math.floor(Number(query.get("per_page")) || 25)));
    const where = { deletedAt: query.get("deleted") === "true" ? { not: null } : null,
      OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] };
    const [rows, total] = await Promise.all([
      prisma.user.findMany({ where, select: fields, take: perPage, skip: (page - 1) * perPage, orderBy: { createdAt: "desc" } }),
      prisma.user.count({ where }),
    ]);
    return Response.json({ rows, total, page, per_page: perPage, columns: [
      { name: "name", label: "Имя" }, { name: "email", label: "Email" }, { name: "role", label: "Роль" }, { name: "createdAt", label: "Создан" },
    ] });
  } catch (error) { return authErrorResponse(error); }
}

export async function createUser(request: Request) {
  try {
    requireAdmin(await requireUser(request, { csrf: true }));
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте имя, email и пароль (минимум 6 символов)" }, { status: 400 });
    const { password, ...data } = parsed.data;
    const id = randomUUID();
    return Response.json(await prisma.user.create({ data: { ...data, id, username: id, passwordHash: await hashPassword(password) }, select: fields }), { status: 201 });
  } catch (error) { return authErrorResponse(error); }
}

export async function editUser(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser(request, { csrf: true });
    requireAdmin(actor);
    const { id } = await params;
    const parsed = request.method === "DELETE" ? { success: true as const, data: {} as z.infer<typeof editSchema> } : editSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте данные пользователя" }, { status: 400 });
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('vetenergy-users-admin-lock'))`;
    requireAdmin(await requireUser(request, { csrf: true }));
    const user = await prisma.user.findUnique({ where: { id, deletedAt: {} } });
    if (!user) return Response.json({ error: "Пользователь не найден" }, { status: 404 });
    const deleting = request.method === "DELETE";
    if (user.deletedAt && !parsed.data.restore) return Response.json({ error: "Сначала восстановите пользователя" }, { status: 409 });
    if (!user.deletedAt && user.role === "ADMIN" && (deleting || parsed.data.role === "USER")) {
      if (await prisma.user.count({ where: { role: "ADMIN" } }) <= 1) return Response.json({ error: "Нельзя удалить или понизить роль последнего администратора" }, { status: 409 });
    }
    if (deleting) {
      await prisma.user.delete({ where: { id } });
      await prisma.session.deleteMany({ where: { userId: id } });
      return new Response(null, { status: 204 });
    }
    const { password, restore, ...data } = parsed.data;
    const updated = await prisma.user.update({
      where: { id, deletedAt: {} },
      data: { ...data, ...(password ? { passwordHash: await hashPassword(password) } : {}), ...(restore ? { deletedAt: null, deletedById: null } : {}) },
      select: fields,
    });
    if (password || data.email || data.role || restore) await prisma.session.deleteMany({ where: { userId: id } });
    return Response.json(updated);
  } catch (error) { return authErrorResponse(error); }
}
