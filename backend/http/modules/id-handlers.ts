import { z } from "zod";
import { AuthError, authErrorResponse, requireUser } from "@backend/auth/session";
import { prisma } from "@backend/infrastructure/database/prisma";

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  species: z.enum(["CAT", "DOG"]),
  archived: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request, { csrf: true });
    if (user.role !== "ADMIN") throw new AuthError(403, "Изменять формулы может только администратор");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Проверьте параметры методики" }, { status: 400 });
    const { id } = await params;
    return Response.json(await prisma.module.update({ where: { id }, data: parsed.data }));
  } catch (error) {
    return authErrorResponse(error);
  }
}
