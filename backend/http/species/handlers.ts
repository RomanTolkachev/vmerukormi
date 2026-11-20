import { z } from "zod";
import { authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { csrf: true });
    if (user.role !== "ADMIN") return Response.json({ error: "Виды животных добавляет только администратор" }, { status: 403 });
    const parsed = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,39}$/), name: z.string().trim().min(1).max(80) }).safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Укажите название и латинский код вида (например RABBIT)" }, { status: 400 });
    const species = await prisma.animalSpecies.create({ data: parsed.data });
    return Response.json({ ...species, id: species.code }, { status: 201 });
  } catch (error) { return authErrorResponse(error); }
}
