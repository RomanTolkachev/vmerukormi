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
    const parsed = z.object({ name: z.string().trim().min(1).max(60) }).safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Введите название тега" }, { status: 400 });
    const slug = tagSlug(parsed.data.name);
    if (!slug) return Response.json({ error: "Название тега не содержит букв или цифр" }, { status: 400 });
    const existing = await prisma.productTag.findUnique({ where: { userId_slug: { userId: user.id, slug } } });
    if (existing) return Response.json(existing);
    return Response.json(await prisma.productTag.create({ data: { name: parsed.data.name, slug, userId: user.id } }), { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
