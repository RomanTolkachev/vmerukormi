import { z } from "zod";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

function tagSlug(name: string) {
  return name
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    const parsed = z.object({ name: z.string().trim().min(1).max(60), isShared: z.boolean().default(false) }).safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Введите название тега" }, { status: 400 });
    if (parsed.data.isShared && user.role !== "ADMIN") return Response.json({ error: "Общий каталог изменяет только администратор" }, { status: 403 });
    const slug = tagSlug(parsed.data.name);
    if (!slug) return Response.json({ error: "Название тега не содержит букв или цифр" }, { status: 400 });
    const existing = await prisma.productTag.findUnique({ where: { userId_slug: { userId: user.id, slug } } });
    if (existing && existing.isShared !== parsed.data.isShared) return Response.json({ error: "Тег с таким именем уже есть в другом каталоге" }, { status: 409 });
    if (existing) return Response.json(existing);
    return Response.json(await prisma.productTag.create({ data: { ...parsed.data, slug, userId: user.id } }), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
